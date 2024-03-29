# NotiSender Desktop
Electron + NodeJS implement of NotiSender

This application is based on [SyncProtocol](https://github.com/choiman1559/RemoteSync-Node).
Please check out the following papers to explore the details of the techniques used:

[TODO: add link]()

__You need full Java runtime installed to use all feature (Not Headless-JRE)__

## Screenshots
<img src="https://github.com/choiman1559/NotiSender-Desktop/blob/master/docs/Screenshot_1.png"  width="30%" height="40%"> <img src="https://github.com/choiman1559/NotiSender-Desktop/blob/master/docs/Screenshot_2.png"  width="30%" height="40%"> <img src="https://github.com/choiman1559/NotiSender-Desktop/blob/master/docs/Screenshot_3.png"  width="30%" height="40%">

## How to use
1. Download prebuilt artifacts at [release](https://github.com/choiman1559/NotiSender-Desktop/releases/latest) page.

(So far, only Windows and Linux based on amd64 and arm64 are supported, MacOS support is planned)

2. Install artifacts according to your OS environment.
3. After running NotiSender-Desktop, log in from the "Settings" menu.
4. After logging in, restart NotiSender-Desktop.
5. (Optional) After pairing with another device, you can use the remote functions.

## Features
 __Remote functions__
 - Send notification with custom title and message
 - Copy text to clipboard
 - Open link in browser
 - Trigger tasker event (Receive only works on Android)
 - Run application with package name
 - Run terminal command (Unstable)
 - Send file to another device (Max file size. 100MB)
 - Use another device as remote control for presentation
 
 __Notification Mirroring__
 - Receive notification
 - Start remote application run
 - Notification history
 - Reply for SMS/Phone notification
 
