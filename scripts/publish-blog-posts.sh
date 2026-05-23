#!/bin/sh

set -eu

# shellcheck disable=SC1007
_script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" >/dev/null 2>&1 && pwd)
# shellcheck disable=SC1091
. "${_script_dir}/common.sh"

main() {
    _mode="single"
    _pr_number=""
    _merge_method="squash"
    _mark_ready="false"
    _dry_run="false"

    while [ "$#" -gt 0 ]; do
        case "$1" in
        --all)
            _mode="all"
            ;;
        --pr)
            shift
            if [ "$#" -eq 0 ]; then
                fail 'Error: --pr requires a pull request number.'
            fi
            _pr_number="$1"
            ;;
        --merge)
            shift
            if [ "$#" -eq 0 ]; then
                fail 'Error: --merge requires one of squash|merge|rebase.'
            fi
            _merge_method="$1"
            ;;
        --ready)
            _mark_ready="true"
            ;;
        --dry-run)
            _dry_run="true"
            ;;
        -h | --help)
            _print_help
            exit 0
            ;;
        *)
            printf 'Error: unknown option %s\n' "$1" >&2
            _print_help >&2
            exit 1
            ;;
        esac
        shift
    done

    _validate_merge_method "${_merge_method}"

    if [ -n "${_pr_number}" ]; then
        _merge_single "${_pr_number}" "${_merge_method}" "${_mark_ready}" "${_dry_run}"
        exit 0
    fi

    if [ "${_mode}" = "all" ]; then
        _merge_all "${_merge_method}" "${_mark_ready}" "${_dry_run}"
        exit 0
    fi

    fail 'Error: choose --pr <number> or --all.'
}

# Displays supported options for the publish workflow.
_print_help() {
    cat <<'EOF'
Usage:
  sh scripts/publish-blog-posts.sh --pr <number> [--merge squash|merge|rebase] [--ready] [--dry-run]
  sh scripts/publish-blog-posts.sh --all [--merge squash|merge|rebase] [--ready] [--dry-run]

Options:
  --pr <number>   Merge a specific pull request
  --all           Merge all open blog pull requests
  --merge <mode>  Merge method (default: squash)
  --ready         Mark draft pull requests ready before merging
  --dry-run       Show actions without changing anything
  -h, --help      Show this message
EOF
}

# Restricts merge method to gh-supported values.
_validate_merge_method() {
    _merge_method=$1
    case "${_merge_method}" in
    squash | merge | rebase)
        ;;
    *)
        fail 'Error: merge method must be squash, merge, or rebase.'
        ;;
    esac
}

# Merges one PR after optional ready transition and confirmation.
_merge_single() {
    _pr_number=$1
    _merge_method=$2
    _mark_ready=$3
    _dry_run=$4

    _pr_state_line=$(gh pr view "${_pr_number}" --json number,title,isDraft,state --jq '.number|tostring + "\t" + .title + "\t" + (.isDraft|tostring) + "\t" + .state')

    _state=$(printf '%s' "${_pr_state_line}" | cut -f4)
    if [ "${_state}" != "OPEN" ]; then
        fail 'Error: PR #%s is not open.' "${_pr_number}"
    fi

    _confirm_merge "${_pr_state_line}" "${_merge_method}" "${_dry_run}" || exit 1
    _merge_pr "${_pr_state_line}" "${_merge_method}" "${_mark_ready}" "${_dry_run}"
}

# Lists and merges all open blog PRs with explicit confirmation.
_merge_all() {
    _merge_method=$1
    _mark_ready=$2
    _dry_run=$3
    _tab=$(printf '\t')

    # shellcheck disable=SC2016
    _prs=$(gh pr list --state open --json number,title,isDraft,state,labels --jq '.[] | ([.labels[].name] | index("blog")) as $has_blog_label | select($has_blog_label != null or (.title | startswith("Blog:"))) | .number|tostring + "\t" + .title + "\t" + (.isDraft|tostring) + "\t" + .state')

    if [ -z "${_prs}" ]; then
        printf 'No open blog PRs found.\n'
        exit 0
    fi

    printf 'Open blog PRs:\n'
    printf '%s\n' "${_prs}" | while IFS="${_tab}" read -r _num _title _is_draft _state; do
        printf '  #%s  %s  (draft=%s)\n' "${_num}" "${_title}" "${_is_draft}"
    done

    _confirm_batch_merge "${_merge_method}" "${_dry_run}" || exit 1

    printf '%s\n' "${_prs}" | while IFS= read -r _line; do
        [ -n "${_line}" ] || continue
        _merge_pr "${_line}" "${_merge_method}" "${_mark_ready}" "${_dry_run}"
    done
}

# Confirms a single-PR merge action from the user.
_confirm_merge() {
    _line=$1
    _merge_method=$2
    _dry_run=$3

    _num=$(printf '%s' "${_line}" | cut -f1)
    _title=$(printf '%s' "${_line}" | cut -f2)

    printf 'About to merge PR #%s (%s) using %s' "${_num}" "${_title}" "${_merge_method}"
    if [ "${_dry_run}" = "true" ]; then
        printf ' [dry-run]'
    fi
    printf '. Continue? [y/N]: '

    IFS= read -r _answer
    case "${_answer}" in
    y | Y | yes | YES)
        return 0
        ;;
    *)
        printf 'Cancelled.\n'
        return 1
        ;;
    esac
}

# Confirms multi-PR merge actions from the user.
_confirm_batch_merge() {
    _merge_method=$1
    _dry_run=$2

    printf 'About to merge all listed blog PRs using %s' "${_merge_method}"
    if [ "${_dry_run}" = "true" ]; then
        printf ' [dry-run]'
    fi
    printf '. Continue? [y/N]: '

    IFS= read -r _answer
    case "${_answer}" in
    y | Y | yes | YES)
        return 0
        ;;
    *)
        printf 'Cancelled.\n'
        return 1
        ;;
    esac
}

# Executes one PR merge operation with optional draft-to-ready transition.
_merge_pr() {
    _line=$1
    _merge_method=$2
    _mark_ready=$3
    _dry_run=$4

    _pr_number=$(printf '%s' "${_line}" | cut -f1)
    _pr_title=$(printf '%s' "${_line}" | cut -f2)
    _is_draft=$(printf '%s' "${_line}" | cut -f3)

    if [ "${_mark_ready}" = "true" ] && [ "${_is_draft}" = "true" ]; then
        if [ "${_dry_run}" = "true" ]; then
            printf '[dry-run] gh pr ready %s\n' "${_pr_number}"
        else
            gh pr ready "${_pr_number}"
        fi
    fi

    _merge_flag="--squash"
    case "${_merge_method}" in
    merge)
        _merge_flag="--merge"
        ;;
    rebase)
        _merge_flag="--rebase"
        ;;
    esac

    if [ "${_dry_run}" = "true" ]; then
        printf '[dry-run] gh pr merge %s %s --delete-branch\n' "${_pr_number}" "${_merge_flag}"
        return
    fi

    printf 'Merging PR #%s (%s)\n' "${_pr_number}" "${_pr_title}"
    gh pr merge "${_pr_number}" "${_merge_flag}" --delete-branch
}

main "$@"
