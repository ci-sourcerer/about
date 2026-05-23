#!/bin/sh

set -eu

# shellcheck disable=SC1007
_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" >/dev/null 2>&1 && pwd)
# shellcheck disable=SC1091
. "${_script_dir}/common.sh"

usage() {
    cat <<'EOF'
Usage: sh scripts/blog-post.sh <command> [options] [args]

Commands:
    create [title] [slug]   Create a new blog post
    edit <slug>             Edit an existing blog post (creates branch + draft PR)
    delete <slug>           Delete an existing blog post (creates branch + draft PR)
  -h, --help                          Show this message
EOF
}

main() {
    if [ "$#" -eq 0 ]; then
        usage
        exit 1
    fi

    cmd=$1
    shift

    case "${cmd}" in
    create)
        cmd_create "$@"
        ;;
    edit)
        cmd_edit "$@"
        ;;
    delete)
        cmd_delete "$@"
        ;;
    -h | --help)
        usage
        exit 0
        ;;
    *)
        fail 'Error: unknown command %s' "${cmd}"
        ;;
    esac
}

# Helpers
_utc_date() {
    date -u +%Y-%m-%d
}

_create_post_file() {
    _path=$1
    _title=$2
    _slug=$3
    _date=$4

    cat >"${_path}" <<EOF
---
title: "${_title}"
slug: "${_slug}"
date: "${_date}"
summary: ""
tags: []
draft: true
---

Write your post here.
EOF
}

_extract_title() {
    _path=$1
    _title=$(sed -n 's/^title:[[:space:]]*"\(.*\)"$/\1/p' "${_path}" | sed -n '1p' || true)
    printf '%s' "${_title}"
}

_default_pr_body() {
    _action=$1
    _what=$2
    case "${_action}" in
    add)
        cat <<EOF
Add a new blog post: ${_what}

This PR was created by \`scripts/blog-post.sh\`.
EOF
        ;;
    edit)
        cat <<EOF
Edit blog post: ${_what}

This PR was created by \`scripts/blog-post.sh\`.
EOF
        ;;
    remove)
        cat <<EOF
Remove the blog post: ${_what}

This PR was created by \`scripts/blog-post.sh\`.
EOF
        ;;
    esac
}

_ask_publish_now() {
    printf 'Run scripts/publish-blog-posts.sh now? [y/N]: '
    IFS= read -r _answer

    case "${_answer}" in
    y | Y | yes | YES)
        sh scripts/publish-blog-posts.sh
        ;;
    *)
        printf 'Skipping publish step.\n'
        ;;
    esac
}

cmd_create() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
        -h | --help)
            cat <<'EOF'
Usage: sh scripts/blog-post.sh create [title] [slug]

Create a new blog post by creating a branch, drafting the post, and opening a PR.
EOF
            exit 0
            ;;
        --)
            shift
            break
            ;;
        -*)
            fail 'Error: unknown option %s' "$1"
            ;;
        *)
            break
            ;;
        esac
    done

    _ensure_git_repo
    _ensure_clean_worktree

    _title="${1:-}"
    _slug_input="${2:-}"

    _title=$(_trim "${_title}")
    if [ -z "${_title}" ]; then
        printf 'Post title: '
        IFS= read -r _title
    fi

    _title=$(_trim "${_title}")
    if [ -z "${_title}" ]; then
        fail 'Error: title cannot be empty.'
    fi

    if [ -z "${_slug_input}" ]; then
        printf 'Slug (optional, press Enter to auto-generate): '
        IFS= read -r _slug_input
    fi

    _slug=$(_normalize_slug "${_slug_input}")
    if [ -z "${_slug}" ]; then
        _slug=$(_normalize_slug "${_title}")
    fi

    if ! _is_valid_slug "${_slug}"; then
        fail 'Error: slug must be kebab-case with lowercase letters and numbers.'
    fi

    _branch="blog/${_slug}"
    _post_path="content/blog/${_slug}.md"

    if [ -e "${_post_path}" ]; then
        fail 'Error: %s already exists.' "${_post_path}"
    fi

    _base_ref=$(_resolve_base_ref)
    printf 'Using base ref: %s\n' "${_base_ref}"

    git checkout -b "${_branch}" "${_base_ref}"

    _date=$(_utc_date)
    _create_post_file "${_post_path}" "${_title}" "${_slug}" "${_date}"

    _editor=$(_resolve_editor)
    printf 'Opening %s in %s\n' "${_post_path}" "${_editor}"
    _open_in_editor "${_editor}" "${_post_path}"

    git add "${_post_path}"
    git commit -m "add post ${_slug}"
    git push -u origin "${_branch}"

    _pr_title="Blog: ${_title}"
    _pr_body=$(_default_pr_body add "${_title}")

	# shellcheck disable=SC2016
	gh pr create --base main --head "${_branch}" --title "${_pr_title}" --body "${_pr_body}" --draft >/dev/null
	printf 'PR created for branch %s.\n' "${_branch}"

    _ask_publish_now
}

cmd_edit() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
        -h | --help)
            cat <<'EOF'
Usage: sh scripts/blog-post.sh edit <slug>

Edit an existing post by creating a branch, opening the file in your editor, then committing and opening a draft PR.
EOF
            exit 0
            ;;
        --)
            shift
            break
            ;;
        -*)
            fail 'Error: unknown option %s' "$1"
            ;;
        *)
            break
            ;;
        esac
    done

    _ensure_git_repo
    _ensure_clean_worktree

    _slug_input="${1:-}"
    _slug=$(_normalize_slug "${_slug_input}")
    if [ -z "${_slug}" ]; then
        printf 'Slug of post to edit: '
        IFS= read -r _slug_input
        _slug=$(_normalize_slug "${_slug_input}")
    fi

    if [ -z "${_slug}" ]; then
        fail 'Error: slug cannot be empty.'
    fi

    if ! _is_valid_slug "${_slug}"; then
        fail 'Error: slug must be kebab-case with lowercase letters and numbers.'
    fi

    _post_path="content/blog/${_slug}.md"
    if [ ! -e "${_post_path}" ]; then
        fail 'Error: %s does not exist.' "${_post_path}"
    fi

    _branch="blog/edit-${_slug}"

    _base_ref=$(_resolve_base_ref)
    printf 'Using base ref: %s\n' "${_base_ref}"

    git checkout -b "${_branch}" "${_base_ref}"

    _title=$(_extract_title "${_post_path}")
    if [ -z "${_title}" ]; then
        _title="${_slug}"
    fi

    _editor=$(_resolve_editor)
    printf 'Opening %s in %s\n' "${_post_path}" "${_editor}"
    _open_in_editor "${_editor}" "${_post_path}"

    # Check for changes; if none, abort
    if git diff --quiet -- "${_post_path}" && git diff --cached --quiet -- "${_post_path}"; then
        printf 'No changes detected; aborting.\n'
        return 0
    fi

    git add "${_post_path}"
    git commit -m "docs(blog): edit post ${_slug}"
    git push -u origin "${_branch}"

    _pr_title="Edit blog post: ${_title}"
    _pr_body=$(_default_pr_body edit "${_title}")

    if gh pr create --base main --head "${_branch}" --title "${_pr_title}" --body "${_pr_body}" --draft --label blog >/dev/null; then
        printf 'Draft PR created for branch %s.\n' "${_branch}"
    else
        # shellcheck disable=SC2016
        printf 'Warning: failed to create PR with label `blog` (label may not exist); retrying without label.\n' >&2
        gh pr create --base main --head "${_branch}" --title "${_pr_title}" --body "${_pr_body}" --draft >/dev/null
        printf 'Draft PR created for branch %s.\n' "${_branch}"
    fi
}

cmd_delete() {
    while [ "$#" -gt 0 ]; do
        case "$1" in
        -h | --help)
            cat <<'EOF'
Usage: sh scripts/blog-post.sh delete <slug>

Delete an existing post by creating a branch that removes the file, then opening a draft PR.
EOF
            exit 0
            ;;
        --)
            shift
            break
            ;;
        -*)
            fail 'Error: unknown option %s' "$1"
            ;;
        *)
            break
            ;;
        esac
    done

    _ensure_git_repo
    _ensure_clean_worktree

    _slug_input="${1:-}"

    _slug=$(_normalize_slug "${_slug_input}")
    if [ -z "${_slug}" ]; then
        printf 'Slug of post to delete: '
        IFS= read -r _slug_input
        _slug=$(_normalize_slug "${_slug_input}")
    fi

    if [ -z "${_slug}" ]; then
        fail 'Error: slug cannot be empty.'
    fi

    if ! _is_valid_slug "${_slug}"; then
        fail 'Error: slug must be kebab-case with lowercase letters and numbers.'
    fi

    _post_path="content/blog/${_slug}.md"
    if [ ! -e "${_post_path}" ]; then
        fail 'Error: %s does not exist.' "${_post_path}"
    fi

    _branch="blog/remove-${_slug}"

    _base_ref=$(_resolve_base_ref)
    printf 'Using base ref: %s\n' "${_base_ref}"

    git checkout -b "${_branch}" "${_base_ref}"

    _title=$(_extract_title "${_post_path}")
    if [ -z "${_title}" ]; then
        _title="${_slug}"
    fi

    git rm "${_post_path}"
    git commit -m "docs(blog): remove post ${_slug}"
    git push -u origin "${_branch}"

    _pr_title="Remove blog post: ${_title}"
    _pr_body=$(_default_pr_body remove "${_slug}")

    if gh pr create --base main --head "${_branch}" --title "${_pr_title}" --body "${_pr_body}" --draft --label blog >/dev/null; then
        printf 'Draft PR created for branch %s.\n' "${_branch}"
    else
        # shellcheck disable=SC2016
        printf 'Warning: failed to create PR with label `blog` (label may not exist); retrying without label.\n' >&2
        gh pr create --base main --head "${_branch}" --title "${_pr_title}" --body "${_pr_body}" --draft >/dev/null
        printf 'Draft PR created for branch %s.\n' "${_branch}"
    fi
}

main "$@"
