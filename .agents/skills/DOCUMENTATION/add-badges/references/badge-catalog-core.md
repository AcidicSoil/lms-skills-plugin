# Badge Catalog: Core

Standard badges for most repositories. ~30 badges covering CI status, package registries, licensing, language, and social metrics.

## Table of Contents

- [status](#status)
- [package](#package)
- [license](#license)
- [language](#language)
- [social](#social)

---

## status

### GitHub Actions CI Status
- **URL**: `https://img.shields.io/github/actions/workflow/status/{owner}/{repo}/{file}?style=flat-square&logo=githubactions&logoColor=white`
- **Native**: `https://github.com/{owner}/{repo}/actions/workflows/{file}/badge.svg` (preferred for private repo support)
- **Icon**: `githubactions` (`2088FF`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/actions/workflows/{file}`
- **Alt**: `CI status`
- **Badgen**: `https://badgen.net/github/checks/{owner}/{repo}`
- **Platforms**: `github`

### GitLab CI Pipeline Status
- **URL**: `https://img.shields.io/gitlab/pipeline-status/{owner}%2F{repo}?style=flat-square&logo=gitlab&logoColor=white`
- **Native**: `https://gitlab.com/{owner}/{repo}/badges/main/pipeline.svg`
- **Icon**: `gitlab` (`FC6D26`) — logoColor: white
- **Link**: `https://gitlab.com/{owner}/{repo}/-/pipelines`
- **Alt**: `GitLab pipeline status`
- **Platforms**: `gitlab`

### CircleCI Status
- **URL**: `https://img.shields.io/circleci/build/github/{owner}/{repo}?style=flat-square&logo=circleci&logoColor=white`
- **Native**: `https://circleci.com/gh/{owner}/{repo}.svg?style=svg`
- **Icon**: `circleci` (`343434`) — logoColor: white
- **Link**: `https://circleci.com/gh/{owner}/{repo}`
- **Alt**: `CircleCI status`
- **Platforms**: `github`

### Travis CI Status
- **URL**: `https://img.shields.io/travis/com/{owner}/{repo}?style=flat-square&logo=travisci&logoColor=white`
- **Icon**: `travisci` (`3EAAAF`) — logoColor: white
- **Link**: `https://app.travis-ci.com/github/{owner}/{repo}`
- **Alt**: `Travis CI status`

---

## package

### PyPI Version
- **URL**: `https://img.shields.io/pypi/v/{package}?style=flat-square&logo=pypi&logoColor=white`
- **Icon**: `pypi` (`3775A9`) — logoColor: white
- **Link**: `https://pypi.org/project/{package}/`
- **Alt**: `PyPI version`
- **Badgen**: `https://badgen.net/pypi/v/{package}`

### PyPI Downloads
- **URL**: `https://img.shields.io/pypi/dm/{package}?style=flat-square&logo=pypi&logoColor=white`
- **Icon**: `pypi` (`3775A9`) — logoColor: white
- **Link**: `https://pypi.org/project/{package}/`
- **Alt**: `PyPI downloads`

### PyPI Python Versions
- **URL**: `https://img.shields.io/pypi/pyversions/{package}?style=flat-square&logo=python&logoColor=white`
- **Icon**: `python` (`3776AB`) — logoColor: white
- **Link**: `https://pypi.org/project/{package}/`
- **Alt**: `Python versions`

### npm Version
- **URL**: `https://img.shields.io/npm/v/{package}?style=flat-square&logo=npm&logoColor=white`
- **Icon**: `npm` (`CB3837`) — logoColor: white
- **Link**: `https://www.npmjs.com/package/{package}`
- **Alt**: `npm version`
- **Badgen**: `https://badgen.net/npm/v/{package}`

### npm Downloads
- **URL**: `https://img.shields.io/npm/dm/{package}?style=flat-square&logo=npm&logoColor=white`
- **Icon**: `npm` (`CB3837`) — logoColor: white
- **Link**: `https://www.npmjs.com/package/{package}`
- **Alt**: `npm downloads`
- **Badgen**: `https://badgen.net/npm/dm/{package}`

### Crates.io Version
- **URL**: `https://img.shields.io/crates/v/{package}?style=flat-square&logo=rust&logoColor=white`
- **Icon**: `rust` (`000000`) — logoColor: white
- **Link**: `https://crates.io/crates/{package}`
- **Alt**: `Crates.io version`

### Crates.io Downloads
- **URL**: `https://img.shields.io/crates/d/{package}?style=flat-square&logo=rust&logoColor=white`
- **Icon**: `rust` (`000000`) — logoColor: white
- **Link**: `https://crates.io/crates/{package}`
- **Alt**: `Crates.io downloads`

### Go Reference
- **URL**: `https://img.shields.io/badge/go-reference-007D9C?style=flat-square&logo=go&logoColor=white`
- **Native**: `https://pkg.go.dev/badge/{package}.svg`
- **Icon**: `go` (`00ADD8`) — logoColor: white
- **Link**: `https://pkg.go.dev/{package}`
- **Alt**: `Go reference`

### GitHub Release
- **URL**: `https://img.shields.io/github/v/release/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/releases/latest`
- **Alt**: `GitHub release`
- **Badgen**: `https://badgen.net/github/release/{owner}/{repo}`
- **Platforms**: `github`

### NuGet Version
- **URL**: `https://img.shields.io/nuget/v/{package}?style=flat-square&logo=nuget&logoColor=white`
- **Icon**: `nuget` (`004880`) — logoColor: white
- **Link**: `https://www.nuget.org/packages/{package}`
- **Alt**: `NuGet version`

### Packagist Version
- **URL**: `https://img.shields.io/packagist/v/{owner}/{package}?style=flat-square&logo=packagist&logoColor=white`
- **Icon**: `packagist` (`F28D1A`) — logoColor: black
- **Link**: `https://packagist.org/packages/{owner}/{package}`
- **Alt**: `Packagist version`

### RubyGems Version
- **URL**: `https://img.shields.io/gem/v/{package}?style=flat-square&logo=rubygems&logoColor=white`
- **Icon**: `rubygems` (`E9573F`) — logoColor: white
- **Link**: `https://rubygems.org/gems/{package}`
- **Alt**: `RubyGems version`

### Hex.pm Version
- **URL**: `https://img.shields.io/hexpm/v/{package}?style=flat-square&logo=elixir&logoColor=white`
- **Icon**: `elixir` (`4B275F`) — logoColor: white
- **Link**: `https://hex.pm/packages/{package}`
- **Alt**: `Hex.pm version`

---

## license

### GitHub License
- **URL**: `https://img.shields.io/github/license/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/blob/main/LICENSE`
- **Alt**: `License`
- **Badgen**: `https://badgen.net/github/license/{owner}/{repo}`
- **Requires**: `public-api`
- **Platforms**: `github`

---

## language

### Python
- **URL**: `https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white`
- **Icon**: `python` (`3776AB`) — logoColor: white
- **Link**: `https://www.python.org/`
- **Alt**: `Python`

### JavaScript
- **URL**: `https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black`
- **Icon**: `javascript` (`F7DF1E`) — logoColor: black
- **Link**: `https://developer.mozilla.org/en-US/docs/Web/JavaScript`
- **Alt**: `JavaScript`

### TypeScript
- **URL**: `https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white`
- **Icon**: `typescript` (`3178C6`) — logoColor: white
- **Link**: `https://www.typescriptlang.org/`
- **Alt**: `TypeScript`

### Rust
- **URL**: `https://img.shields.io/badge/Rust-000000?style=flat-square&logo=rust&logoColor=white`
- **Icon**: `rust` (`000000`) — logoColor: white
- **Link**: `https://www.rust-lang.org/`
- **Alt**: `Rust`

### Go
- **URL**: `https://img.shields.io/badge/Go-00ADD8?style=flat-square&logo=go&logoColor=white`
- **Icon**: `go` (`00ADD8`) — logoColor: white
- **Link**: `https://go.dev/`
- **Alt**: `Go`

### Java
- **URL**: `https://img.shields.io/badge/Java-ED8B00?style=flat-square&logo=openjdk&logoColor=white`
- **Icon**: `openjdk` (`ED8B00`) — logoColor: white
- **Link**: `https://www.java.com/`
- **Alt**: `Java`

### Ruby
- **URL**: `https://img.shields.io/badge/Ruby-CC342D?style=flat-square&logo=ruby&logoColor=white`
- **Icon**: `ruby` (`CC342D`) — logoColor: white
- **Link**: `https://www.ruby-lang.org/`
- **Alt**: `Ruby`

### PHP
- **URL**: `https://img.shields.io/badge/PHP-777BB4?style=flat-square&logo=php&logoColor=white`
- **Icon**: `php` (`777BB4`) — logoColor: white
- **Link**: `https://www.php.net/`
- **Alt**: `PHP`

### C#
- **URL**: `https://img.shields.io/badge/C%23-512BD4?style=flat-square&logo=dotnet&logoColor=white`
- **Icon**: `dotnet` (`512BD4`) — logoColor: white
- **Link**: `https://learn.microsoft.com/en-us/dotnet/csharp/`
- **Alt**: `C#`

### Swift
- **URL**: `https://img.shields.io/badge/Swift-F05138?style=flat-square&logo=swift&logoColor=white`
- **Icon**: `swift` (`F05138`) — logoColor: white
- **Link**: `https://www.swift.org/`
- **Alt**: `Swift`

### Dart
- **URL**: `https://img.shields.io/badge/Dart-0175C2?style=flat-square&logo=dart&logoColor=white`
- **Icon**: `dart` (`0175C2`) — logoColor: white
- **Link**: `https://dart.dev/`
- **Alt**: `Dart`

### Elixir
- **URL**: `https://img.shields.io/badge/Elixir-4B275F?style=flat-square&logo=elixir&logoColor=white`
- **Icon**: `elixir` (`4B275F`) — logoColor: white
- **Link**: `https://elixir-lang.org/`
- **Alt**: `Elixir`

### Kotlin
- **URL**: `https://img.shields.io/badge/Kotlin-7F52FF?style=flat-square&logo=kotlin&logoColor=white`
- **Icon**: `kotlin` (`7F52FF`) — logoColor: white
- **Link**: `https://kotlinlang.org/`
- **Alt**: `Kotlin`

---

## social

### GitHub Stars
- **URL**: `https://img.shields.io/github/stars/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/stargazers`
- **Alt**: `GitHub stars`
- **Badgen**: `https://badgen.net/github/stars/{owner}/{repo}`
- **Requires**: `public-api`
- **Platforms**: `github`

### GitHub Forks
- **URL**: `https://img.shields.io/github/forks/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/network/members`
- **Alt**: `GitHub forks`
- **Requires**: `public-api`
- **Platforms**: `github`

### GitHub Issues
- **URL**: `https://img.shields.io/github/issues/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/issues`
- **Alt**: `GitHub issues`
- **Badgen**: `https://badgen.net/github/open-issues/{owner}/{repo}`
- **Requires**: `public-api`
- **Platforms**: `github`

### GitHub Contributors
- **URL**: `https://img.shields.io/github/contributors/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/graphs/contributors`
- **Alt**: `GitHub contributors`
- **Requires**: `public-api`
- **Platforms**: `github`

### GitHub Last Commit
- **URL**: `https://img.shields.io/github/last-commit/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}/commits`
- **Alt**: `GitHub last commit`
- **Badgen**: `https://badgen.net/github/last-commit/{owner}/{repo}`
- **Platforms**: `github`

### GitHub Repo Size
- **URL**: `https://img.shields.io/github/repo-size/{owner}/{repo}?style=flat-square&logo=github&logoColor=white`
- **Icon**: `github` (`181717`) — logoColor: white
- **Link**: `https://github.com/{owner}/{repo}`
- **Alt**: `GitHub repo size`
- **Platforms**: `github`
