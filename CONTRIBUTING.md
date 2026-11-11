# Contributing to Emotune

Thanks for your interest in contributing to Emotune, an emotion-based music player. Contributions of all kinds are welcome: bug reports, feature ideas, documentation fixes, and code.

## Ways to contribute

- **Report bugs:** open an issue describing what happened, what you expected, and how to reproduce it.
- **Suggest features:** open an issue explaining the idea and why it would help users.
- **Improve docs:** fix typos, clarify setup steps, or add examples.
- **Submit code:** fix a bug or implement a feature via a pull request.

## Getting started

1. Fork the repository and clone your fork:
   ```bash
   git clone https://github.com/aashishranjan1331/EmoTune.git
   cd Emotune
   ```
2. Add the original repository as a remote so you can stay up to date:
   ```bash
   git remote add upstream https://github.com/aashishranjan1331/EmoTune.git
   ```
3. Install dependencies and set up the project as described in the [README](README.md).
4. Create a branch for your work:
   ```bash
   git checkout -b feature/short-description
   ```

## Making changes

- Keep each pull request focused on one change.
- Follow the existing code style and naming conventions.
- Add or update tests when you change behavior.
- Update the documentation if your change affects how the app is used.
- Do not commit secrets, API keys, or large model/dataset files.

## Commit messages

Write clear, present-tense messages that explain what changed and why:

```
Add fallback playlist when no face is detected
Fix crash when webcam permission is denied
```

## Submitting a pull request

1. Make sure the project builds and tests pass locally.
2. Push your branch to your fork.
3. Open a pull request against the `main` branch and describe:
   - what the change does,
   - why it is needed,
   - how you tested it,
   - the related issue number, if any (for example, `Closes #12`).
4. Respond to review feedback. A maintainer will merge once everything looks good.

## Reporting bugs

A good bug report includes:

- Steps to reproduce the problem
- Expected behavior and actual behavior
- Your operating system, browser or runtime version, and Emotune version
- Screenshots or logs, if available

## Datasets, models, and third-party content

If your contribution adds a dataset, pretrained model, or music source, make sure its license allows redistribution and use in this project, and mention the license in your pull request.

## Code of conduct

Be respectful and constructive. Harassment and discrimination are not tolerated. Assume good intent, and keep feedback focused on the work, not the person.

## License

By contributing to Emotune, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## Questions

Not sure where to start? Open an issue with your question and we will help you out.