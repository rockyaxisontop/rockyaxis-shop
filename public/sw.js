/*
 * MT Store service worker (entry point).
 *
 * A browser allows only one service worker per scope, and Firebase Cloud
 * Messaging must own `/firebase-messaging-sw.js` so pushes can arrive while the
 * tab is closed (a PWA install is NOT required — this is ordinary web push).
 *
 * That worker also carries the caching/offline behaviour, so this file just
 * loads it. Registering `/sw.js` and registering the FCM worker now converge on
 * the same single worker instead of fighting over the scope — which is what
 * previously made `/firebase-messaging-sw.js` fail to serve at all.
 */
importScripts("/firebase-messaging-sw.js");
