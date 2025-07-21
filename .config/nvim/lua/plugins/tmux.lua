-- tmux.nvim
-- https://github.com/aserowy/tmux.nvim

return {
	"aserowy/tmux.nvim",
	config = function()
		return require("tmux").setup()
	end,
}
