-- claudecode.nvim
-- https://github.com/coder/claudecode.nvim

vim.pack.add {
  'https://github.com/folke/snacks.nvim',
  'https://github.com/coder/claudecode.nvim',
}

require('snacks').setup()
require('claudecode').setup {
  terminal = {
    snacks_win_opts = {
      keys = {
        nav_h = {
          '<C-h>',
          function() require('tmux').move_left() end,
          mode = 't',
          desc = 'Navigate left',
        },
        nav_j = {
          '<C-j>',
          function() require('tmux').move_top() end,
          mode = 't',
          desc = 'Navigate down',
        },
        nav_k = {
          '<C-k>',
          function() require('tmux').move_bottom() end,
          mode = 't',
          desc = 'Navigate up',
        },
        nav_l = {
          '<C-l>',
          function() require('tmux').move_right() end,
          mode = 't',
          desc = 'Navigate right',
        },
      },
    },
  },
}

vim.keymap.set('n', '<leader>ac', '<cmd>ClaudeCode<cr>', { desc = 'Toggle Claude' })
vim.keymap.set('n', '<leader>af', '<cmd>ClaudeCodeFocus<cr>', { desc = 'Focus Claude' })
vim.keymap.set('n', '<leader>ar', '<cmd>ClaudeCode --resume<cr>', { desc = 'Resume Claude session' })
vim.keymap.set('n', '<leader>aC', '<cmd>ClaudeCode --continue<cr>', { desc = 'Continue Claude session' })
vim.keymap.set('n', '<leader>am', '<cmd>ClaudeCodeSelectModel<cr>', { desc = 'Select Claude model' })
vim.keymap.set('n', '<leader>ab', '<cmd>ClaudeCodeAdd %<cr>', { desc = 'Add buffer to Claude' })
vim.keymap.set('v', '<leader>as', '<cmd>ClaudeCodeSend<cr>', { desc = 'Send selection to Claude' })
vim.keymap.set('n', '<leader>as', '<cmd>ClaudeCodeTreeAdd<cr>', { desc = 'Add tree entry to Claude' })
vim.keymap.set('n', '<leader>aa', '<cmd>ClaudeCodeDiffAccept<cr>', { desc = 'Accept Claude diff' })
vim.keymap.set('n', '<leader>ad', '<cmd>ClaudeCodeDiffDeny<cr>', { desc = 'Reject Claude diff' })
