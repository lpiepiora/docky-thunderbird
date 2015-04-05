var dockyunread = {
	MSG_FOLDER_FLAG_ALL: 0x0004,
	MSG_FOLDER_FLAG_INBOX: 0x1000,
	onLoad : function(e) {
		dump("Loading Docky Unread Count...\n");
		
		// read all the preferences
		const PREF_SERVICE = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
		this.prefs = PREF_SERVICE.getBranch("extensions.docky-unread@lpiepiora.com.");
		this.prefs.QueryInterface(Components.interfaces.nsIPrefBranch2);
		this.prefs.addObserver("", this, false);
     
     	this.traverseDeep = this.prefs.getBoolPref("traverse-deep");
 
		// initialization code
		this.initialized = true;
	},
	
	onClose: function(e) {
		dump("Closing Docky Unread Count...\n");
		
		this.prefs.removeObserver("", this);
		
		this.initialized = true;
		this.resetUnreadCount();
	},
	
	resetUnreadCount: function() {
		dump("Resetting unread badge\n");
		this.updateUnreadCount(0, true);
	},
	
	updateUnreadCount: function(x, blockingProcess){
		dump("Calling update count\n");
		dump("Finding path...\n");
		
		const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
		try { 
			path=(new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path; 
		} catch (e) {
			alert(error);
		}
		
		path = path + "/extensions/docky-unread@lpiepiora.com/chrome/content/update-badge.py";
		
		dump("Found path: " + path + "\n");

		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);		
		file.initWithPath("/usr/bin/env");
		
		var args = ["python", path, x];
		var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		process.init(file);
		
		dump("Initialising process with arguments " + args + " is blocking = " + blockingProcess + "\n");
		process.run(blockingProcess, args, args.length);
	},

	onItemCountChanged : function() {
		dump("Item count changed...\n");
		if (this.timeoutId != -1) {
			window.clearTimeout(this.timeoutId);
		}
		// Schedule on the main thread
		this.timeoutId = window.setTimeout(this.performUnreadCount, 1000, this);
	},
	
	performUnreadCount: function(that) {
		dump("Counting unread messages...\n");
		var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
		var accounts = acctMgr.accounts;
		var totalCount = 0;
		dump("Found " + accounts.length + " accounts\n");
		for (var i = 0; i < accounts.length; i++) {
			var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
			var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder            
				if (rootFolder.hasSubFolders) {
					totalCount += that.getTotalCount(rootFolder);
				}
		}
		dump("Found total : " + totalCount + "\n");
		that.updateUnreadCount(totalCount, false);
	},

	getTotalCount: function(rootFolder) {
		if(rootFolder.getAllFoldersWithFlag) {
			return this._getTotalCountTB2(rootFolder);
		} else {
			return this._getTotalCountTB3(rootFolder);
		}
	},
	
	_getTotalCountTB2: function(rootFolder) {
		dump("Using _getTotalCountTB2\n");
		var totalCount = 0;
		dump("Finding all folders with inbox flag : " + this.MSG_FOLDER_FLAG_INBOX + "\n");
		var subFolders = rootFolder.getAllFoldersWithFlag(this.MSG_FOLDER_FLAG_INBOX); //nsISupportsArray
		dump("Found " + subFolders.Count() + "folders\n");
		
		for(var i = 0; i < subFolders.Count(); i++) {
			var folder = subFolders.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgFolder);
			dump("Get Number of unread messages with travese deep = " +  this.traverseDeep + "\n");
			totalCount += folder.getNumUnread(this.traverseDeep);
		}
		
		dump("Found total " + totalCount + "in all subFolders\n");
		return totalCount;
	},

	_getTotalCountTB3: function(rootFolder) {
		dump("Using _getTotalCountTB3\n");
		var folderFlag = this.traverseDeep ? this.MSG_FOLDER_FLAG_ALL : this.MSG_FOLDER_FLAG_INBOX
		var totalCount = 0;
		dump("Finding all folders with inbox flag : " + folderFlag + "\n");
		var subFolders = rootFolder.getFoldersWithFlags(folderFlag); //nsIArray
		var subFoldersEnumerator = subFolders.enumerate();
		
		while(subFoldersEnumerator.hasMoreElements()) {
			var folder = subFoldersEnumerator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
			dump("Get Number of unread messages with travese deep = " +  this.traverseDeep + "\n");
			totalCount += folder.getNumUnread(false);
		}
		
		dump("Found total " + totalCount + "in all subFolders\n");
		return totalCount;
	},

	folderListener : {
		OnItemAdded : function(parent, item, viewString) {
				dockyunread.onItemCountChanged();
		},
		OnItemRemoved : function(parent, item, viewString) {
				dockyunread.onItemCountChanged();
		},
		OnItemPropertyFlagChanged : function(item, property, oldFlag, newFlag) {
			if (property=="Status"){
				dockyunread.onItemCountChanged();
			}
		},
		OnItemEvent : function(item, event) {
				dockyunread.onItemCountChanged();
		},
		
		OnFolderLoaded : function(aFolder) {},
		OnDeleteOrMoveMessagesCompleted : function(aFolder) {},
		OnItemPropertyChanged : function(parent, item, viewString) {},
		OnItemIntPropertyChanged : function(item, property, oldVal, newVal) {},
		OnItemBoolPropertyChanged : function(item, property, oldValue, newValue) {},
		OnItemUnicharPropertyChanged : function(item, property, oldValue, newValue) {}
	},
	
	observe: function(subject, topic, data) {
		if (topic != "nsPref:changed") {
			return;
		}
 
		switch(data) {
			case "traverse-deep":
				this.traverseDeep = this.prefs.getBoolPref("traverse-deep");
				dockyunread.onItemCountChanged();
			break;
		}
	},
	
	mailSession: '',
	notifyFlags: '',
	timeoutId: -1
};

window.addEventListener("load", function(e) { dockyunread.onLoad(e); }, false);
window.addEventListener("close", function(e) { dockyunread.onClose(e); }, false); 

dockyunread.mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
dockyunread.notifyFlags = Components.interfaces.nsIFolderListener.all;
dockyunread.mailSession.AddFolderListener(dockyunread.folderListener, dockyunread.notifyFlags);
