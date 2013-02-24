exports.createServer = function createServer(params) {
    var cs = arguments.callee.caller.caller.arguments[0]('./client-side');
    var compound = cs(params.root);
    return compound.app;
};
