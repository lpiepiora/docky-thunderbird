#!/usr/bin/env python

import sys
import dbus
import os
import re

def toDockyItem(path):
	itemObj = bus.get_object("org.gnome.Docky", path)
	itemInt = dbus.Interface(itemObj, "org.gnome.Docky.Item")
	return itemInt

bus = dbus.SessionBus()
obj = bus.get_object("org.gnome.Docky", "/org/gnome/Docky")
docky = dbus.Interface(obj, "org.gnome.Docky")

if len(sys.argv) < 2:
	unread_count = 0
else:
	unread_count = int(sys.argv[1])

dockyItems = [toDockyItem(path) for path in docky.DockItemPaths()]

for item in dockyItems:
	if (item.GetOwnsDesktopFile() and re.search("thunderbird[^/]*.desktop", item.GetDesktopFile())):
		if (unread_count > 0):
			item.SetBadgeText("%s" % unread_count)
		else:
			item.ResetBadgeText()
