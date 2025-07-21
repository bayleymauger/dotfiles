-- CopilitChat.nvim
-- https://github.com/CopilotC-Nvim/CopilotChat.nvim

return {
	"CopilotC-Nvim/CopilotChat.nvim",
	branch = "main",
	dependencies = {
		{ "zbirenbaum/copilot.lua" }, -- or github/copilot.vim
		{ "nvim-lua/plenary.nvim" }, -- for curl, log wrapper
	},
	opts = {
		debug = true,
		model = "claude-sonnet-4",
		window = {
			width = 0.3,
		},
	},
	keys = {
		-- Toggle Copilot
		{
			"<leader>ccp",
			function()
				require("CopilotChat").toggle()
			end,
			desc = "CopilotChat - Open",
		},
		-- Quick chat with Copilot
		{
			"<leader>ccq",
			function()
				local input = vim.fn.input("Quick Chat: ")
				if input ~= "" then
					require("CopilotChat").ask(input, { selection = require("CopilotChat.select").buffer })
				end
			end,
			desc = "CopilotChat - Quick chat",
		},
	},
}
