#!/usr/bin/env python

import sys
import dbus
from dbus import Interface
import os
import re

DOCKY21_NAME = 'org.freedesktop.DockManager'
DOCKY21_PATH = '/org/freedesktop/DockManager'
ITEM21_NAME = 'org.gnome.Docky'
ITEM21_IFACE = 'org.gnome.Docky.Item'

class DockyDBus:
	def __init__(self, name=DOCKY21_NAME, path=DOCKY21_PATH, itemName = ITEM21_NAME, itemIFace = ITEM21_IFACE):
		self.bus = dbus.SessionBus()
		self.obj = self.bus.get_object(name, path)
		self.count = 0 if len(sys.argv) < 2 else int(sys.argv[1])
		## Path and interfaces
		self.itemName = itemName
		self.itemIFace = itemIFace
		
	def update(self):
		for item in self.__getThunderbirdDockyItems():
			if self.count:
				self._setBadge(item, str(self.count))
			else:
				self._setBadge(item, '')
				
	def __getThunderbirdDockyItems(self, expr="thunderbird[^/]*.desktop"):
		dockyItems = [self.__toDockyItem(path) for path in self._getItemsPaths()]
		return [option for option in dockyItems if re.search(expr, self._getFileName(option))]

	def __toDockyItem(self, path):
		itemObj = self.bus.get_object(self.itemName, path)
		itemInt = Interface(itemObj, self.itemIFace)
		return itemInt

	def _setBadge(self, item, text):
		item.UpdateDockItem({"badge": text })

	def _getItemsPaths(self):
		return Interface(self.obj, "org.freedesktop.DockManager").GetItems()

	def _getFileName(self, item):
		props = Interface(item, 'org.freedesktop.DBus.Properties')
		return props.Get('org.freedesktop.DockItem', 'DesktopFile')

class DockyDBus20(DockyDBus):
	def __init__(self):
		DockyDBus.__init__(self, 'org.gnome.Docky', '/org/gnome/Docky', 'org.gnome.Docky', 'org.gnome.Docky.Item')

	def _getItemsPaths(self):
		return Interface(self.obj, "org.gnome.Docky").DockItemPaths()
	
	def _getFileName(self, item):
		return item.GetDesktopFile();
	
	def _setBadge(self, item, text):
		item.SetBadgeText(text) if text else item.ResetBadgeText()
		

######
######
######
try:
	DockyDBus().update()
except BaseException as e:
	print "Couldn't connect to docky - using fallback to v2.0.x. Reason: ", e
	#Fallback to old docky
	DockyDBus20().update()
