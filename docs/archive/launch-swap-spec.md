I'm thinkingh that the unique swap scenario (perhaps where a dev has to context switch) would be best
handled by a tracking mechanism like .devsolo/sessions where the stash id that is created can be tied to the
original session. The stash could be named in a particular way that it was damn obvious that it was a
auto-generated stash from a swap or switch operation. Then when the user swapped back to another session
which happened to have a stash associated with it, that could be popped and their previous state
reestablished. In the end, this is the comparison:

## Swapping and Switching

Swap Command
------------
In scenarios when the user needs to context switch and work on a different task without losing their current work,
the user can use the swap command. This will create a new or use an existing session based on the branch name passed. Any existing uncommitted changes will be stashed and the stash id will be recorded against the session. The user can then swap back to the original session and their previous state will be reestablished.

Switch Command
--------------
In scenarios when the user needs to switch to a different branch without losing their current work and wants to take that current work to the new branch. Any existing uncommitted changes will be stashed and a new branch created by initialising a new session. When the session is created, it will be passed the stash id so that it can immediately pop the changes on the new branch. The original session will be aborted.

Abort Command
-------------
The abort command will delete the session and the branch.

| Action             | Swap                      | Switch                    |
|--------------------|---------------------------|---------------------------|
| Abort Session | ✅ The uncommitted changes are stashed but Abort is NOT called.  | ✅ The uncommitted changes are stashed and Abort IS called. |
| Stash uncommitted changes | ✅ With a unique name that identifies them as an auto-stash and are recorded against the session | ✅ With a unique name that identifies them as an auto-stash which will be passed immediately to the launch command |
| Lifetime of the stash | ✅ Deleted after the user swaps back to the original session | ✅ Deleted after the launch command pops them in a new branch |
| New Sessions | ✅ The user can swap to a new session and the stash id will remain associated with the original session | ✅ The user can swap to a new session and stash id will be passed so it can be popped in the new one |
| Existing Sessions | ✅ The user can swap to an existing session and the stash id will remain associated with the original session | ✅ The user cannot swap to an existing session |
| Session Deletion | ✅ The session is never deleted when the user swaps to either a new session or back to the original session | ✅ The original session is deleted when the user switches to a new session. |
| Branch Creation | ✅ When the swaps to a new session, the branch will be created for it based on standard naming conventions. | ✅ When the user switches to a new session, the branch will be created for it based on standard naming conventions. |

Abort Command
-------------
- Deletes the Session
- Deletes the Branch

Launch Command
--------------
- Creates a new Session
- Creates a new Branch
- Pops the stash if it was passed

