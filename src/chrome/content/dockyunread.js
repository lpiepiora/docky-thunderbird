var dockyunread = {
	MSG_FOLDER_FLAG_INBOX: 0x1000,
	onLoad : function(e) {
		// initialization code
		this.initialized = true;
	},
	
	onClose: function(e) {
		this.initialized = true;
		this.resetUnreadCount();
	},
	
	resetUnreadCount: function() {
		this.updateUnreadCount(0, true);
	},
	
	updateUnreadCount: function(x, blockingProcess){
		var file = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
		
		const DIR_SERVICE = new Components.Constructor("@mozilla.org/file/directory_service;1","nsIProperties");
		try { 
			path=(new DIR_SERVICE()).get("ProfD", Components.interfaces.nsIFile).path; 
		} catch (e) {
			alert(error);
		}
		
		path = path + "/extensions/docky-unread@lpiepiora.com/chrome/content/update-badge.py";

		file.initWithPath("/usr/bin/env");
		
		var args = ["python", path, x];
		var process = Components.classes["@mozilla.org/process/util;1"].createInstance(Components.interfaces.nsIProcess);
		process.init(file);
		process.run(blockingProcess, args, args.length);
	},

	onItemCountChanged : function() {
		if (this.timeoutId != -1) {
			window.clearTimeout(this.timeoutId);
		}
		// Schedule on the main thread
		this.timeoutId = window.setTimeout(this.performUnreadCount, 1000, this);
	},
	
	performUnreadCount: function(that) {
                var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
                var accounts = acctMgr.accounts;
                var totalCount = 0;
                for (var i = 0; i < accounts.Count(); i++) {
                        var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
                        var rootFolder = account.incomingServer.rootFolder; // nsIMsgFolder            
                        if (rootFolder.hasSubFolders) {
				totalCount += that.getTotalCount(rootFolder);
                        }
                }
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
	   var totalCount = 0;
	   var subFolders = rootFolder.getAllFoldersWithFlag(this.MSG_FOLDER_FLAG_INBOX); //nsISupportsArray
	   for(var i = 0; i < subFolders.Count(); i++) {
		   var folder = subFolders.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgFolder);
		   totalCount += folder.getNumUnread(false);
	   }
	   return totalCount;
	},

	_getTotalCountTB3: function(rootFolder) {
	   var totalCount = 0;
	   var subFolders = rootFolder.getFoldersWithFlags(this.MSG_FOLDER_FLAG_INBOX); //nsIArray
	   var subFoldersEnumerator = subFolders.enumerate();
	   while(subFoldersEnumerator.hasMoreElements()) {
		var folder = subFoldersEnumerator.getNext().QueryInterface(Components.interfaces.nsIMsgFolder);
		totalCount += folder.getNumUnread(false);
	   }
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
	mailSession: '',
	notifyFlags: '',
	timeoutId: -1
};

window.addEventListener("load", function(e) { dockyunread.onLoad(e); }, false);
window.addEventListener("close", function(e) { dockyunread.onClose(e); }, false); 

dockyunread.mailSession = Components.classes["@mozilla.org/messenger/services/session;1"].getService(Components.interfaces.nsIMsgMailSession);
dockyunread.notifyFlags = Components.interfaces.nsIFolderListener.all;
dockyunread.mailSession.AddFolderListener(dockyunread.folderListener, dockyunread.notifyFlags);
