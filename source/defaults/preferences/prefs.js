//This may be dead. It allows inforss setting to be saved in sync
pref("extensions.weave.engine.inforss", true);

// inforssDebug calls produce alert boxes
pref("inforss.debug.alert", false);
// inforssDebug calls write to the browser log
pref("inforss.debug.log", false);
// inforssDebug calls write to the status bar
pref("inforss.debug.statusbar", false);

//Traces on entry/exit to various functions. Must run <browser> --console
//Needs to be set manually and is only processed on startup.
pref("inforss.debug.traceinconsole", false);

//Don't know about these yet

//Syncing of something to/from a repository
//pref("inforss.repository.autosync", false);
//pref("inforss.repository.directory", "");
//pref("inforss.repository.protocol", "ftp:");
//pref("inforss.repository.server", "");
//pref("inforss.repository.user", "");

//The top bar is a toolbar and can be hidden from the toolbar menu, so remember
//the state
pref("inforss.toolbar.collapsed", false);
