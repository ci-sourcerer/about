#!/bin/sh

set -eu

fail() {
    if [ "$#" -eq 0 ]; then
        printf '%s\n' 'Error: unknown failure.' >&2
        exit 1
    fi

    _fmt=$1
    shift
    if [ "$#" -gt 0 ]; then
        # shellcheck disable=SC2059
        printf '%s\n' "$(printf -- "${_fmt}" "$@")" >&2
    else
        printf '%s\n' "${_fmt}" >&2
    fi

    exit 1
}

# Verifies the current directory is inside a git work tree.
_ensure_git_repo() {
    if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        fail 'Error: this script must run inside a git repository.'
    fi
}

# Prevents accidental branch creation while there are uncommitted changes.
_ensure_clean_worktree() {
    if ! git diff --quiet || ! git diff --cached --quiet; then
        fail 'Error: tracked changes are not clean. Commit or stash changes first.'
    fi
}

# Picks the best available editor, preferring EDITOR and then common fallbacks.
_resolve_editor() {
    if [ -n "${EDITOR:-}" ]; then
        printf '%s\n' "${EDITOR}"
        return
    fi

    _candidate=""
    for _candidate in code nano vi; do
        if command -v "${_candidate}" >/dev/null 2>&1; then
            printf '%s\n' "${_candidate}"
            return
        fi
    done

    fail 'Error: no editor found; set EDITOR.'
}

# Opens a file with either a simple editor command or a command string with args.
_open_in_editor() {
    _editor_cmd=$1
    _file_path=$2

    case "${_editor_cmd}" in
    *[[:space:]]*)
        sh -c "${_editor_cmd} \"${_file_path}\""
        ;;
    *)
        "${_editor_cmd}" "${_file_path}"
        ;;
    esac
}

# Chooses origin/main when available and falls back to local main.
_resolve_base_ref() {
    if git show-ref --verify --quiet refs/remotes/origin/main; then
        printf 'origin/main\n'
        return
    fi

    if git show-ref --verify --quiet refs/heads/main; then
        printf 'main\n'
        return
    fi

    fail 'Error: main branch was not found locally or in origin.'
}

# Sanitizes user-provided strings by trimming outer whitespace.
_trim() {
    printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

# Converts arbitrary text into lowercase kebab-case slug.
_normalize_slug() {
    printf '%s' "$1" |
        tr '[:upper:]' '[:lower:]' |
        sed 's/[^a-z0-9]/-/g; s/-\{2,\}/-/g; s/^-//; s/-$//'
}

# Validates slug shape: lowercase words separated by single hyphens.
_is_valid_slug() {
    printf '%s\n' "$1" | grep -Eq '^[a-z0-9]+(-[a-z0-9]+)*$'
}
