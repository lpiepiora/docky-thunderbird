#!/usr/bin/env python

import sys
import dbus
from dbus import Interface
import os
import re

DOCKY21_NAME = 'net.launchpad.DockManager'
DOCKY21_PATH = '/net/launchpad/DockManager'
ITEM21_NAME = 'org.gnome.Docky'
ITEM21_IFACE = 'net.launchpad.DockItem'

class DockyDBus:
	def __init__(self, name=DOCKY21_NAME, path=DOCKY21_PATH, itemName = ITEM21_NAME, itemIFace = ITEM21_IFACE):
		self.bus = dbus.SessionBus()
		self.obj = self.bus.get_object(name, path)
		self.count = 0 if len(sys.argv) < 2 else int(sys.argv[1])
		## Path and interfaces
		self.name = name
		self.path = path
		self.itemName = itemName
		self.itemIFace = itemIFace
		
	def update(self):
		for item in self.__getThunderbirdDockyItems():
			if self.count:
				self._setBadge(item, str(self.count))
			else:
				self._setBadge(item, '')
				
	def __getThunderbirdDockyItems(self, expr="(thunderbird|icedove)[^/]*.desktop"):
		dockyItems = [self.__toDockyItem(path) for path in self._getItemsPaths()]
		return [option for option in dockyItems if re.search(expr, self._getFileName(option), re.IGNORECASE)]

	def __toDockyItem(self, path):
		itemObj = self.bus.get_object(self.itemName, path)
		itemInt = Interface(itemObj, self.itemIFace)
		return itemInt

	def _setBadge(self, item, text):
		item.UpdateDockItem({"badge": text })

	def _getItemsPaths(self):
		return Interface(self.obj, self.name).GetItems()

	def _getFileName(self, item):
		props = Interface(item, 'org.freedesktop.DBus.Properties')
		return props.Get(self.itemIFace, 'DesktopFile')

class DockyDBus21(DockyDBus):
	def __init__(self):
		DockyDBus.__init__(self, 'org.freedesktop.DockManager', '/org/freedesktop/DockManager', 'org.gnome.Docky', 'org.freedesktop.DockItem');

class DockyDBus20(DockyDBus):
	def __init__(self):
		DockyDBus.__init__(self, 'org.gnome.Docky', '/org/gnome/Docky', 'org.gnome.Docky', 'org.gnome.Docky.Item')

	def _getItemsPaths(self):
		return Interface(self.obj, "org.gnome.Docky").DockItemPaths()
	
	def _getFileName(self, item):
		return item.GetDesktopFile();
	
	def _setBadge(self, item, text):
		item.SetBadgeText(text) if text else item.ResetBadgeText()
		
class KDEDBus(DockyDBus):
	def __init__(self):
		DockyDBus.__init__(self, 'net.launchpad.DockManager', '/net/launchpad/DockManager', 'net.launchpad.DockManager', 'net.launchpad.DockItem');

######
######
######
if os.environ.get('KDE_FULL_SESSION') == 'true': # running under kde
	try:
		KDEDBus().update();
	except BaseException as e:
		print "Couldn't connect to KDE Dockmanager - falling back to Docky. Reason: ", e
else:	#Running under something else :(
	try:
		DockyDBus().update()
	except BaseException as e:
		print "Couldn't connect to docky - using fallback to v2.1.x. Reason: ", e
		#Fallback to 21
		try:
			DockyDBus21().update()
		except BaseException as e:
			print "Couldn't connect to docky - using fallback to 2.0.x. Reason: ", e
			#Fallback to old docky
			DockyDBus20().update()

