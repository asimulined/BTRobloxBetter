"use strict"

const GroupShouts = (() => {
	const groupshouts = {
		version: 3
	}
	let notifAudio

	const createNotif = (notifId, options, success, click) => {
		chrome.notifications.create(notifId, options, success)

		if(typeof click === "function") {
			const onclick = id => {
				if(id !== notifId) return;
				click()
			}

			const onclose = id => {
				if(id !== notifId) return;
				chrome.notifications.onClicked.removeListener(onclick)
				chrome.notifications.onClosed.removeListener(onclose)
			}

			chrome.notifications.onClicked.addListener(onclick)
			chrome.notifications.onClosed.addListener(onclose)
		}
	}

	const executeCheck = async () => {
		let doc
		try {
			const response = await fetch("https://www.roblox.com/Feeds/GetUserFeed", { credentials: "include" })
			const responseText = await response.text()

			doc = new DOMParser().parseFromString(responseText, "text/html")
		} catch(ex) {
			console.error(ex)
			return
		}

		const items = doc.documentElement.querySelectorAll(".feeds .list-item")
		const groupsDone = {}
		let hasPlayedSound = false

		items.forEach(item => {
			const link = item.querySelector(".list-content a:first-child")
			const groupUrl = link.href
			const groupName = link.textContent

			if(groupUrl.indexOf("groups.aspx") === -1) return;

			let groupId = groupUrl.match(/gid=(\d+)/)
			groupId = groupId ? parseInt(groupId[1], 10) : null
			if(groupId == null || isNaN(groupId) || groupsDone[groupId]) return;

			groupsDone[groupId] = true

			const groupEmblem = item.querySelector(".header-thumb").getAttribute("src")
			const posterLink = item.querySelector(".text-name")
			const poster = posterLink.textContent
			let posterid = parseInt(posterLink.href.match(/\/users\/(\d+)/)[1], 10)
			const date = item.querySelector(".text-date-hint").textContent
			const body = item.querySelector(".feedtext").textContent.replace(/^"(.*)"$/, "$1")

			if(isNaN(posterid)) posterid = -1;

			const lastShout = groupshouts[groupId]
			if(!lastShout || lastShout.posterid !== posterid || lastShout.body !== body || lastShout.date !== date) {
				groupshouts[groupId] = { poster, posterid, body, date }
				STORAGE.set({ groupshouts })

				if(!lastShout) return; // Don't show anything on first init

				createNotif(`groupshout-${groupId}`, {
					type: "basic",
					title: groupName,
					iconUrl: groupEmblem,
					message: body,
					contextMessage: poster,

					priority: 2,
					requireInteraction: true,
					isClickable: true
				}, () => {
					if(hasPlayedSound) return;
					hasPlayedSound = true

					if(!notifAudio) notifAudio = new Audio("res/notification.mp3");
					notifAudio.play()
				}, () => {
					chrome.tabs.create({ url: groupUrl })
				})
			}
		})
	}

	const startChecking = () => {
		chrome.alarms.get("GroupShouts", alarm => {
			if(!alarm) {
				chrome.alarms.create("GroupShouts", {
					delayInMinutes: 1,
					periodInMinutes: 1
				})
			}
		})
	}

	const stopChecking = () => {
		chrome.alarms.clear("GroupShouts")
	}

	chrome.alarms.onAlarm.addListener(alarm => {
		if(alarm.name === "GroupShouts") executeCheck();
	})

	let isFirstLoad = false
	chrome.runtime.onInstalled.addListener(() => { isFirstLoad = true })

	STORAGE.get(["groupshouts"], data => {
		if(data.groupshouts && data.groupshouts.version === groupshouts.version) Object.assign(groupshouts, data.groupshouts);

		Settings.get(settings => {
			const shouldCheckShouts = () => settings.groups.enabled && settings.groups.shoutAlerts
			let isChecking = shouldCheckShouts()

			if(isChecking) {
				startChecking()
				if(isFirstLoad) executeCheck();
			} else {
				stopChecking()
			}

			let previousCheck = 0
			Settings.onChange(() => {
				const shouldCheck = shouldCheckShouts()
				if(isChecking !== shouldCheck) {
					isChecking = shouldCheck

					if(isChecking) {
						startChecking()
						if(Date.now() - previousCheck > 1) { // Just so that spam-changing the option wont flood requests
							previousCheck = Date.now()
							executeCheck()
						}
					} else {
						stopChecking()
					}
				}
			})
		})
	})
	return {}
})();