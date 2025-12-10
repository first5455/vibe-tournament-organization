# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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
