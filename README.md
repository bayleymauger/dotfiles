# dotfiles

This repository contains my personal dotfiles. These are the base configuration files that I use to set up a new machine to my liking.

## Dependencies

- [GNU Stow](https://www.gnu.org/software/stow/)
- [Git](https://git-scm.com/)

GNU Stow is a symlink farm manager which takes distinct packages of software and/or data located in separate directories on the filesystem, and makes them appear to be installed in the same place.

Git is a free and open source distributed version control system designed to handle everything from small to very large projects with speed and efficiency.

## Installation

First, clone this repository into your home directory.

```bash
cd ~
git clone https://github.com/bayleymauger/dotfiles.git
```

Then, navigate into the dotfiles directory and use stow to symlink the dotfiles into your home directory.

```bash
cd dotfiles
stow */
```

This will create a symlink for each item in the `dotfiles/` directory in your home directory.

## Adding New Dotfiles

To add new dotfiles, simply create a new directory in the `dotfiles/` directory, and place the dotfiles you want to manage in it. Then, run `stow` as described above.

## Removing Dotfiles

To remove a symlink, navigate to your `dotfiles/` directory and use the `-D` option with stow:

```bash
cd ~/dotfiles
stow -D directoryname
```

This will remove the symlink but leave the original file in place.

## Contributing

If you have suggestions for how I could improve this setup, please let me know or open an issue on GitHub.
