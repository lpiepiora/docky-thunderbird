#!/usr/bin/env python

import sys
import dbus
import os

bus = dbus.SessionBus()
obj = bus.get_object("org.gnome.Docky", "/org/gnome/Docky")
docky = dbus.Interface(obj, "org.gnome.Docky")

if len(sys.argv) < 2:
    unread_count = 0
else:
    unread_count = int(sys.argv[1])

for path in docky.DockItemPaths():
    itemObj = bus.get_object("org.gnome.Docky", path)
    itemInt = dbus.Interface(itemObj, "org.gnome.Docky.Item")
    if (itemInt.GetName().lower().find("thunderbird") != -1):
        if (unread_count > 0):
            itemInt.SetBadgeText("%s" % unread_count)
        else:
            itemInt.ResetBadgeText()
