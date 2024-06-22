-- undotree
-- https://github.com/mbbill/undotree

return {
	"mbbill/undotree",
	config = function()
		vim.keymap.set("n", "<leader>u", function()
			vim.cmd.UndotreeToggle()
			vim.cmd.UndotreeFocus()
		end)
	end,
}
