# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [1.2.6] - 2025-12-21

### Fixed

- **Duel Room**: Fixed critical caching bug where score reports appeared successful but reverted to previous state after page refresh. Removed duplicate GET `/:id` route that was missing cache-control headers.
- **Code Quality**: Removed duplicate DELETE `/:id` route in duels.ts (88 lines of redundant code cleaned up).

### Added

- **Real-Time Updates**: Added WebSocket event emission to deck update endpoint for immediate synchronization across clients.
- **Code Audit**: Completed comprehensive audit of all 11 backend route files to ensure no duplicate route definitions exist.
- **Round Robin Tournaments**: Any tournament participant can now report scores for any match, making score reporting more flexible for casual/social events. Swiss tournaments maintain existing restrictions (only match players + admin).
- **Round Robin Grid**: Improved score display to show results from row player's perspective (row score - column score) with color coding (green for wins, red for losses).

## [1.2.5] - 2025-12-16

### Fixed

- **Real-Time Updates**: Fixed persistent issues with real-time updates for Duel List and Tournaments. Removed duplicate route handlers and ensured proper event emission for Create, Join, Leave, Start, and Match Reporting actions.
- **Admin**: Fixed permission logic bug preventing Admins from updating their own MMR/Stats.
- **Admin**: Added missing real-time triggers for Admin MMR updates, ensuring Leaderboard reflects changes instantly.

### Added

- **Real-Time Updates**: Added real-time updates for Tournament Creation and Deletion.
- **Validation**: Added Name Requirement validation when creating a new Tournament.
- **Stability**: Implemented WebSocket Heartbeat (Ping/Pong) to prevent Cloudflare idle timeouts (100s). All real-time connections now self-monitor connectivity.

## [1.2.4.1] - 2025-12-11

### Added

- **Admin Portal**: Added "Hard Delete" functionality to permanently delete users and all related data (Decks, Stats, Duel History).
- **Security**: Introduced "Owner Role" configuration. Users in the Owner Role are protected from modification or deletion by non-Owners.

## [1.2.4] - 2025-12-11

### Added

- **Admin Portal**: Added "Winner" column to the Tournaments table.
- **Role Management**: Added ability to perform strictly managed System Roles (create/edit with `isSystem` flag).
- **Settings**: Added "Default User Role" configuration. Administrators can now specify which role new users receive upon registration (or "No Role" by default).

### Changed

- **Role Logic**: Removed hardcoded fallback to "User" role. The system now strictly adheres to the "Default User Role" setting. If unset, new users have no role/permissions.
- **Role Deletion**: System roles and the currently active Default Role are protected from deletion or modification of their system status.

## [1.2.3] - 2025-12-11

### Fixed

- **Backend**: Fixed Logic error in `duels.ts` that caused Admin Duel filtering to fail (duplicate variable declaration shadowing the control flag).

## [1.2.2] - 2025-12-11

### Fixed

- **Admin Panel**: Fixed "Change Role" option not appearing in user actions dropdown menu.
- **Admin Panel**: Fixed role names not displaying correctly in users table (was showing "User" for all users).
- **Backend**: Removed remaining legacy `role` column references from `auth.ts` and `roles.ts`.

## [1.2.1] - 2025-12-11

### Fixed

- **Deck Management**: Enforced `gameId` requirement when creating decks.
- **Deck Management**: Fixed bug where `gameId` was undefined due to payload spread order in `DecksPage` and `UserProfilePage`.
- **Deck Listing**: Legacy decks (without `gameId`) are now hidden from default lists to ensure data consistency.

## [1.2.0] - 2025-12-11

### Added

- **Role-Based Access Control (RBAC)**: Complete system overhaul replacing legacy role checks with granular permissions (e.g., `tournaments.manage`, `admin.access`).
- **Session Security**: Added "Force Global Re-login" feature (Backend & Frontend) to invalidate all active sessions instantly.
- **Live Permission Updates**: Client now detects permission changes on window focus and updates state immediately.
- **Admin Portal**: New "Roles" and "Permissions" management interfaces.
- **UX**: "Next Round" in Tournaments now automatically advances the view to the new round.

### Changed

- **UI Consistency**: Standardized button sizes and variants (Primary/Destructive/Outline) across Tournament and Duel views for a cohesive look.
- **Security Hardening**: Deep audit and removal of all legacy `user.role === 'admin'` checks in favor of strict permission guards.

## [1.1.1] - 2025-12-11

### Added

- **Round History**: Added ability to view matches from previous rounds in the Tournament Details page.

## [1.1.0] - 2025-12-11

### Added

- **Dashboard Winner Display**: Completed tournaments now show the winner's avatar and name directly on the dashboard card.
- **Collapsible History**: "Completed Tournaments" section on the dashboard is now collapsible and defaults to open.
- **System Settings**: Added a new "Settings" tab in Admin Portal for global configurations.
- **Maintenance Mode**: Admins can now enable "Maintenance Mode" to restrict access for non-admin users.
- **Data Management**: Added hazardous actions in Admin Portal to "Wipe All History" or "Reset All MMR" (Globally or per-game).

### Changed

- **Status Styling**: Updated tournament status chips on the Dashboard to match the Admin Portal's visual style (Bold/Uppercase).
- **Deleted User Handling**: Deleted users are now hidden from search and leaderboards, but their name is preserved in historical records.
- **UserAvatar**: Added support for `xs` (extra small) avatar size.

## [1.0.0] - 2025-12-10

### Added

- **Multi-Game Support**: Introduced `GameContext` to support multiple games (e.g., Union Arena, One Piece).
- **Game-Specific MMR**: Replaced global MMR with per-game MMR (`user_game_stats` table). All ranks and matchmaking now respect the currently selected game.
- **Split Stats**: User profiles now display separate wins/losses for Tournaments and Duels per game.
- **Game Switcher**: Added a dropdown in the header to switch between active games.
- **Admin Management**: Added "Games" tab in Admin Portal to manage supported games.
- **Migration**: Added `migrate_games` script to safely transition legacy data to the transition to multi-game schema without data loss.

## [0.6.4] - 2025-12-10

### Changed

- **Duel Room**: Added "Going First" indicator for all match statuses, including completed matches.
- **Admin Portal**: Added "1st" badge to duel history table to show who played first.
- **User Profile**: Added "YOU WENT 1ST" / "OPP WENT 1ST" badge to Duel History.

## [0.6.3] - 2025-12-10

### Changed

- **User Profile**: Added scrollable history for Tournaments and Duels to handle long lists gracefully.

## [0.6.2] - 2025-12-10

### Added

- **Decks Management**: Complete deck management system for users and admins.
- **User Profile**: Added "Player Decks" section to view, create, edit, and delete personal decks.
- **Admin Portal**: Added "Decks" tab to list all decks with owner info. Admins can create decks for users and manage any deck.
- **Backend**: Updated `GET /decks` to support fetching all decks with owner details. Updated `POST /decks` to allow admins to create decks for other users.
- **Components**: Added `DeckCard` and `DeckModal` for reusable deck display and editing.

### Fixed

- **Admin Portal**: Resolved JSX corruption and duplicate declaration issues in `AdminPortal.tsx`.

## [0.6.1] - 2025-12-10

### Changed

- Update "Who Went First" to display Player Name/Guest Name instead of "P1/P2"
- Change "View DeckList" Link on DecksPage to Button
- Rename "Play First/Second" labels to "Play First Winrate" and "Play Second Winrate" on DecksPage
- Show Deck Name used in Tournament/Duel History on UserProfilePage
- Change Deck Link in Tournament/Duel History to Button on UserProfilePage

## [0.6.0] - 2025-12-09

### Added

- DeckName Feature and DeckList URL
- Deck Winrate Feature
- First Player Feature

### Changed

- fix avatarURL for security reason

## [0.5.1] - 2025-12-08

### Added

- First Tracking ChangeLog

### Fixed

- fix UserSearchSelect initialValue not working in admin panel

## [0.5.0.1] - 2025-12-08

### Changed

- update dependencies

## [0.5.0] - 2025-12-08

### Added

- First Track Version
