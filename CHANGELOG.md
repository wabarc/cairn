# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- markdownlint-disable -->

## [Unreleased]

## [3.0.0] - 2023-05-24

### Changed
- Re-licensed to MIT ([#687](https://github.com/wabarc/cairn/pull/687))

## [2.3.0] - 2023-05-23

### Added
- Add proxy support

### Changed
- Reusable workflow
- Upgrade dependencies

### Fixed
- Fix cannot ckeckout the code base when pull requests
- Replace set-output with recommended env output

## [2.2.1] - 2021-09-09

### Changed
- Upgrade dependencies
- Packaging binaries

## [2.2.0] - 2021-09-04

### Added
- Add Dockerfile
- Run testing on Node 1.16.x
- Add codeql analysis workflow

### Changed
- Refine release workflow
- Refine testing workflow
- Refine parameters
- Upgrade linter to v4
- Limit repository as condition of publish workflow
- Run test without cache
- Upgrade dependencies
- Bump actions/setup-node from v2.1.2 to v2.1.4
- Bump github/super-linter from v3.13.5 to v3.14.3
- Set linter workflow default branch
- Change default branch to main

### Fixed
- Fix dom selector
- Fix set meta

## [2.1.2] - 2020-11-01

### Fixed
- Fix fetch resources url incorrect

## [2.1.1] - 2020-10-30

### Fixed
- Fix css incorrect

## [2.1.0] - 2020-10-30

### Added
- Add source url meta.

### Fixed
- Fix non utf-8 charset.

## [2.0.1] - 2020-10-26

### Fixed
- Fixed convert open graph title

### Changed
- Disable decodeEntities

## [2.0.0] - 2020-10-26

### Added
- Migrate to `cheerio`.
- Redefine API.

## [1.3.0] - 2020-10-24

### Added
- Clean `utm_*` queries.

### Fixed
- Fix `decodeURI` error.

## [1.2.1] - 2020-10-17

### Fixed
- Handle JSDOM error.

## [1.2.0] - 2020-10-16

### Added
- Add timeout option support.

### Changed
- Refine testing workflow.

## [1.1.2] - 2020-10-11

### Changed
- Remove `tslint.json`
- Rename types.
- Test on multiple platform.

## [1.1.1] - 2020-10-11

### Changed
- Remove `ncc` develop dependency.

### Fixed
- Redefine package entry point.

## [1.1.0] - 2020-10-11

### Added
- Convert Open Graph Metadata, append webpage title when it empty.
- Add publish and release workflow.

### Changed
- Improve regex parse.

### Fixed
- Fix typos in README.

## [1.0.0] - 2020-10-10

### Added
- Initial release.

<!-- markdownlint-restore -->
