-- copilot.lua
-- https://github.com/zbirenbaum/copilot.lua

return {
	"zbirenbaum/copilot.lua",
	cmd = "Copilot",
	event = "InsertEnter",
	config = function()
		require("copilot").setup({
			suggestion = { enabled = false },
			panel = { enabled = false },
			copilot_node_command = vim.fn.expand("$HOME") .. "/.nvm/versions/node/v20.3.0/bin/node", -- Node.js version must be > 20
		})
	end,
}
