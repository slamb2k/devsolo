#compdef hansolo
# ZSH completion for hansolo

_hansolo() {
    local -a commands
    commands=(
        'init:Initialize han-solo in your project'
        'launch:Start a new feature workflow'
        'ship:Complete workflow and merge to main'
        'hotfix:Create emergency hotfix'
        'status:Show current workflow status'
        'sessions:List all active sessions'
        'swap:Switch between sessions'
        'abort:Abort current workflow'
        'resume:Resume an existing session'
        'demo:Run a demonstration'
    )

    local -a common_options
    common_options=(
        '--help[Show help message]'
        '--version[Show version information]'
    )

    _arguments -C \
        '1:command:->command' \
        '*::arg:->args'

    case $state in
        command)
            _describe 'hansolo command' commands
            _arguments $common_options
            ;;
        args)
            case $words[1] in
                init)
                    _arguments \
                        '--force[Force initialization]' \
                        '--scope[Installation scope]:scope:(project global)'
                    ;;
                launch)
                    _arguments \
                        '--branch[Branch name]:branch:' \
                        '-b[Branch name]:branch:' \
                        '--description[Branch description]:description:' \
                        '-d[Branch description]:description:' \
                        '--force[Force launch]' \
                        '-f[Force launch]'
                    ;;
                ship)
                    _arguments \
                        '--message[Commit message]:message:' \
                        '-m[Commit message]:message:' \
                        '--push[Push to remote]' \
                        '--create-pr[Create pull request]' \
                        '--merge[Merge to main]' \
                        '--force[Force ship]' \
                        '-f[Force ship]' \
                        '--yes[Skip confirmations]' \
                        '-y[Skip confirmations]'
                    ;;
                hotfix)
                    local -a hotfix_commands
                    hotfix_commands=(
                        'deploy:Deploy hotfix'
                        'rollback:Rollback hotfix'
                    )

                    _arguments -C \
                        '1:subcommand:->subcommand' \
                        '*::arg:->hotfix_args'

                    case $state in
                        subcommand)
                            _describe 'hotfix subcommand' hotfix_commands
                            _arguments \
                                '--issue[Issue ID]:issue:' \
                                '-i[Issue ID]:issue:' \
                                '--severity[Severity level]:severity:(critical high medium)' \
                                '-s[Severity level]:severity:(critical high medium)' \
                                '--skip-tests[Skip tests]' \
                                '--skip-review[Skip review]' \
                                '--auto-merge[Auto merge]' \
                                '--force[Force hotfix]' \
                                '-f[Force hotfix]' \
                                '--yes[Skip confirmations]' \
                                '-y[Skip confirmations]'
                            ;;
                    esac
                    ;;
                sessions)
                    _arguments \
                        '--all[Show all sessions]' \
                        '-a[Show all sessions]' \
                        '--verbose[Verbose output]' \
                        '-v[Verbose output]' \
                        '--cleanup[Clean up expired sessions]' \
                        '-c[Clean up expired sessions]'
                    ;;
                swap)
                    _arguments \
                        '1:branch:_git_branches' \
                        '--force[Force swap]' \
                        '-f[Force swap]' \
                        '--stash[Stash changes]' \
                        '-s[Stash changes]'
                    ;;
                abort)
                    _arguments \
                        '--force[Force abort]' \
                        '-f[Force abort]' \
                        '--delete-branch[Delete branch]' \
                        '-d[Delete branch]' \
                        '--yes[Skip confirmations]' \
                        '-y[Skip confirmations]' \
                        '--all[Abort all workflows]'
                    ;;
                resume)
                    _arguments '1:branch:_git_branches'
                    ;;
                status|demo)
                    # No additional arguments
                    ;;
            esac
            ;;
    esac
}

# Helper function for git branches
_git_branches() {
    local branches
    branches=(${(f)"$(git branch 2>/dev/null | sed 's/^[* ] //')"})
    _describe 'branch' branches
}

compdef _hansolo hansolo