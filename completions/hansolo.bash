#!/bin/bash
# Bash completion for hansolo

_hansolo() {
    local cur prev opts base
    COMPREPLY=()
    cur="${COMP_WORDS[COMP_CWORD]}"
    prev="${COMP_WORDS[COMP_CWORD-1]}"

    # Main commands
    local commands="init launch ship hotfix status sessions swap abort resume demo --help --version"

    # Command-specific options
    local init_opts="--force --scope"
    local launch_opts="--branch --description --force"
    local ship_opts="--message --push --create-pr --merge --force --yes"
    local hotfix_opts="--issue --severity --skip-tests --skip-review --auto-merge --force --yes deploy rollback"
    local sessions_opts="--all --verbose --cleanup"
    local swap_opts="--force --stash"
    local abort_opts="--force --delete-branch --yes --all"

    # Severity levels for hotfix
    local severity_levels="critical high medium"

    case "${prev}" in
        hansolo)
            COMPREPLY=($(compgen -W "${commands}" -- ${cur}))
            return 0
            ;;
        init)
            COMPREPLY=($(compgen -W "${init_opts}" -- ${cur}))
            return 0
            ;;
        launch)
            COMPREPLY=($(compgen -W "${launch_opts}" -- ${cur}))
            return 0
            ;;
        ship)
            COMPREPLY=($(compgen -W "${ship_opts}" -- ${cur}))
            return 0
            ;;
        hotfix)
            COMPREPLY=($(compgen -W "${hotfix_opts}" -- ${cur}))
            return 0
            ;;
        sessions)
            COMPREPLY=($(compgen -W "${sessions_opts}" -- ${cur}))
            return 0
            ;;
        swap)
            # Complete with branch names
            local branches=$(git branch 2>/dev/null | sed 's/^[* ] //')
            COMPREPLY=($(compgen -W "${branches} ${swap_opts}" -- ${cur}))
            return 0
            ;;
        abort)
            COMPREPLY=($(compgen -W "${abort_opts}" -- ${cur}))
            return 0
            ;;
        resume)
            # Complete with branch names
            local branches=$(git branch 2>/dev/null | sed 's/^[* ] //')
            COMPREPLY=($(compgen -W "${branches}" -- ${cur}))
            return 0
            ;;
        --branch|-b)
            # Suggest branch name format
            COMPREPLY=($(compgen -W "feature/ hotfix/ release/" -- ${cur}))
            return 0
            ;;
        --severity|-s)
            COMPREPLY=($(compgen -W "${severity_levels}" -- ${cur}))
            return 0
            ;;
        --scope)
            COMPREPLY=($(compgen -W "project global" -- ${cur}))
            return 0
            ;;
        *)
            # Check if we're completing a flag value
            case "${cur}" in
                -*)
                    # Get the command from COMP_WORDS
                    local cmd=""
                    for word in "${COMP_WORDS[@]}"; do
                        case $word in
                            init|launch|ship|hotfix|sessions|swap|abort)
                                cmd=$word
                                break
                                ;;
                        esac
                    done

                    # Provide options based on the command
                    case $cmd in
                        init)
                            COMPREPLY=($(compgen -W "${init_opts}" -- ${cur}))
                            ;;
                        launch)
                            COMPREPLY=($(compgen -W "${launch_opts}" -- ${cur}))
                            ;;
                        ship)
                            COMPREPLY=($(compgen -W "${ship_opts}" -- ${cur}))
                            ;;
                        hotfix)
                            COMPREPLY=($(compgen -W "${hotfix_opts}" -- ${cur}))
                            ;;
                        sessions)
                            COMPREPLY=($(compgen -W "${sessions_opts}" -- ${cur}))
                            ;;
                        swap)
                            COMPREPLY=($(compgen -W "${swap_opts}" -- ${cur}))
                            ;;
                        abort)
                            COMPREPLY=($(compgen -W "${abort_opts}" -- ${cur}))
                            ;;
                    esac
                    ;;
            esac
            ;;
    esac
}

complete -F _hansolo hansolo