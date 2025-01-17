"use strict"

pageInit.create = () => {
	// Init global features
	
	Navigation.init()
	SettingsModal.enable()
	
	//
	
	fetch(`https://users.roblox.com/v1/users/authenticated`, { credentials: "include" }).then(async res => {
		const json = await res.json()
		const userId = json?.id ?? -1
		
		loggedInUser = Number.isSafeInteger(userId) ? userId : -1
		loggedInUserPromise.$resolve(loggedInUser)
	})
	
	//
	
	if(!SETTINGS.get("create.enabled")) {
		return
	}
	
	InjectJS.inject(() => {
		const tempHijackEntries = new WeakMap()
		const processedModules = new WeakSet()
		const functionProxies = new WeakMap()
		const reactModuleHandlers = []
		const reactHandlers = []
		const objects = { modules: {} }
		
		BTRoblox.addReactModuleHandler = handler => {
			reactModuleHandlers.push(handler)
		}
		
		BTRoblox.addReactHandler = handler => {
			reactHandlers.push(handler)
		}
		
		BTRoblox.tempHijackFunction = (obj, key, fn) => {
			let entry = tempHijackEntries.get(obj[key])
			
			if(!entry) {
				entry = {
					desc: Object.getOwnPropertyDescriptor(obj, key),
					original: obj[key],
					proxy: new Proxy(obj[key], {
						apply(target, thisArg, args) {
							for(let i = entry.callbacks.length; i--;) {
								const fn = entry.callbacks[i]
								
								if(fn) { // fn can be false if it gets deleted during callback
									try { fn(args) }
									catch(ex) { console.error(ex) }
								}
							}
							return target.apply(thisArg, args)
						}
					}),
					callbacks: []
				}
				
				obj[key] = entry.proxy
				tempHijackEntries.set(entry.original, entry)
				tempHijackEntries.set(entry.proxy, entry)
			}
			
			entry.callbacks.push(fn)
			
			return {
				connected: true,
				disconnect() {
					if(this.connected) {
						this.connected = false
						entry.callbacks.splice(entry.callbacks.indexOf(fn), 1)
						
						if(entry.callbacks.length === 0) {
							tempHijackEntries.delete(entry.original)
							tempHijackEntries.delete(entry.proxy)
							Object.defineProperty(obj, key, entry.desc)
						}
					}
				}
			}
		}
		
		BTRoblox.reactFind = (elem, fn, includeSelf=false) => {
			if(Array.isArray(elem)) {
				for(const child of elem) {
					const result = BTRoblox.reactFind(child, fn, true)
					
					if(result) {
						return result
					}
				}
			} else if(typeof elem === "object" && elem?.props) {
				if(includeSelf && fn(elem)) {
					return elem
				}
				
				return BTRoblox.reactFind(elem.props.children, fn, true)
			}
		}
		
		let isDispatching = false
		
		const onCreateElement = (target, thisArg, args) => {
			const result = target.apply(thisArg, args)
			let type = result.type
			
			if(typeof type === "function") {
				let proxy = functionProxies.get(type)
				
				if(!proxy) {
					proxy = new Proxy(type, {
						apply(target, thisArg, args) {
							const result = target.apply(thisArg, args)
							
							for(const handler of reactHandlers) {
								try { handler(args, result, objects) }
								catch(ex) { console.error(ex) }
							}
							
							return result
						}
					})
					
					functionProxies.set(proxy, proxy)
					functionProxies.set(type, proxy)
				}
				
				// Okay, this is hacky as heck...
				// There's user level code that breaks if result.type is directly
				// set to proxy, so we need to make it only return proxy when we're
				// not executing a component render function.
				
				Object.defineProperty(result, "type", {
					enumerable: true,
					configurable: true,
					get: () => {
						// According to ReactFiberHooks.js, dispatcher will be set to ContextOnlyDispatcher when not rendering
						const dispatcher = objects.React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current
						const isRendering = dispatcher && dispatcher.useCallback !== dispatcher.useEffect
						
						return isRendering ? type : proxy
					},
					set: x => {
						delete result.type
						result.type = x
					}
				})
			}
			
			return result
		}
		
		BTRoblox.addReactModuleHandler((module, target, objects) => {
			if("jsx" in module && "jsxs" in module) {
				module.jsx = module.jsxs = new Proxy(module.jsxs, { apply: onCreateElement })
				objects.jsx = module.jsx
				
			} else if("useState" in module && "useCallback" in module) {
				module.createElement = new Proxy(module.createElement, { apply: onCreateElement })
				objects.React = module
			}
			
			return module
		})
		
		BTRoblox.onSet(window, "webpackChunk_N_E", chunk => {
			const process = item => {
				try {
					for(const name of Object.keys(item[1])) {
						BTRoblox.hijackFunction(item[1], name, (target, thisArg, args) => {
							const result = target.apply(thisArg, args)
							let module = args[0].exports
							
							if(typeof module === "object" && !processedModules.has(module)) {
								processedModules.add(module)
								
								for(const handler of reactModuleHandlers) {
									try { module = handler(module, target, objects) }
									catch(ex) { console.error(ex) }
								}
								
								args[0].exports = module
								objects.modules[name] = module
							}
							
							return result
						})
					}
				} catch(ex) {
					console.error(ex)
				}
			}
			
			const override = pushfn => new Proxy(pushfn, {
				apply(target, thisArg, args) {
					for(const item of args) {
						process(item)
					}
					
					return target.apply(thisArg, args)
				}
			})
			
			let pushoverride = override(chunk.push)
			
			Object.defineProperty(chunk, "push", {
				enumerable: false,
				configurable: true,
				set(v) {
					pushoverride = override(v)
				},
				get() {
					return pushoverride
				}
			})
			
			for(const item in chunk) {
				process(item)
			}
		})
	})
	
	// Populate objects.Mui
	InjectJS.inject(() => {
		BTRoblox.addReactModuleHandler((module, target, objects) => {
			const targetSource = target.toString()
			
			if(targetSource.includes(`MenuItem:function(){return `)) {
				const match = targetSource.match(/MenuItem:function\(\){return (\w+)\.(\w+)}/)
				const match2 = match && targetSource.match(`${match[1]}=\\w+\\((\\d+)\\)`)
				const uiModule = match2 && objects.modules[match2[1]]
						
				if(uiModule) {
					objects.Mui = {
						Avatar: false,
						Button: false,
						CircularProgress: false,
						CloseIcon: false,
						Divider: false,
						Drawer: false,
						Grid: false,
						IconButton: false,
						Link: false,
						List: false,
						ListItem: false,
						Menu: false,
						MenuIcon: false,
						MenuItem: match[2],
						Tab: false,
						Tabs: false,
						Typography: false,
						UIThemeProvider: false,
					}
					
					for(let [key, value] of Object.entries(objects.Mui)) {
						if(!value) {
							value = targetSource.match(`${key}:function\\(\\){return (\\w+)\\.(\\w+)}`)?.[2]
						}
						
						if(value) {
							objects.Mui[key] = uiModule[value]
						}
					}
				}
			}
			
			return module
		})
	})
	
	// Populate objects.NextRouter
	InjectJS.inject(() => {
		BTRoblox.addReactModuleHandler((module, target, objects) => {
			if("useRouter" in module) {
				objects.NextRouter = module
				
				document.addEventListener("click", ev => {
					const anchor = ev.target.nodeName === "A" ? ev.target : ev.target.closest("a")
					
					if(anchor?.classList.contains("btr-next-anchor")) {
						if(!ev.shiftKey && !ev.ctrlKey) {
							ev.preventDefault()
							objects.NextRouter.router.push(anchor.href)
						}
					}
				})
			}
			
			return module
		})
	})
	
	// Add settings
	InjectJS.inject(() => {
		BTRoblox.addReactHandler((args, result, objects) => {
			if(!result?.props) { return }
			
			const menuList = BTRoblox.reactFind(result, x => x.props.MenuListProps && BTRoblox.reactFind(x, x => x.props.content === "Action.LogOut"))
			
			if(menuList) {
				menuList.props.children.unshift(
					objects.React.createElement(objects.Mui.MenuItem, {
						children: "BTR Settings",
						className: "btr-settings-toggle"
					})
				)
			}
		})
	})
	
	// Fix thumbnail2d using batch size of 100 (which errors)
	InjectJS.inject(() => {
		BTRoblox.addReactModuleHandler((module, target, objects) => {
			if(typeof module === "object") {
				const entries = Object.entries(module)
				
				if(entries.length < 10) {
					const batchSize = entries.find(x => x[1] === 100)
					
					if(batchSize && entries.find(x => x[1]?.assetThumbnail === "assetThumbnail")) {
						module = new Proxy(module, {
							get(target, property) {
								if(property === batchSize[0]) {
									return 50
								}
								
								return target[property]
							}
						})
					}
				}
			}
			
			return module
		})
	})
	
	// Adjust options menu items
	if(SETTINGS.get("create.assetOptions")) {
		InjectJS.inject(() => {
			BTRoblox.addReactHandler((args, result, objects) => {
				if(!result?.props) { return }
				
				if(result.props["data-testid"] === "experience-options-menu") {
					const children = result.props.children = [result.props.children].flat(10).filter(x => x)
					
					if(args[0].itemType === "Game") {
						let index = children.findIndex(x => x?.key === "Action.OpenInNewTab")
						if(index !== -1) { children.splice(index, 1) }
						
						index = children.findIndex(x => x?.key === "Action.CopyURL")
						if(index !== -1) { children.splice(index, 1) }
						
						index = children.findIndex(x => x?.key === "Action.CopyUniverseID")
						if(index !== -1) { children.splice(index, 1) }
						
						index = children.findIndex(x => x?.props.children === "Copy Start Place ID")
						if(index !== -1) { children.splice(index, 1) }
						
						index = children.findIndex(x => x?.key === "Action.OpenExperienceDetails")
						if(index !== -1) {
							const entry = children[index]
							delete entry.props.onClick
							
							children[index] = objects.jsx("a", {
								href: `https://www.roblox.com/games/${args[0].creation.assetId}/`,
								target: `_blank`,
								style: { all: "unset", display: "contents" },
								children: entry
							})
						}
						
						index = children.findIndex(x => x?.key === "Configure Localization")
						if(index !== -1) {
							const entry = children[index]
							delete entry.props.onClick
							
							children[index] = objects.jsx("a", {
								href: `/dashboard/creations/experiences/${args[0].creation.universeId}/localization`,
								style: { all: "unset", display: "contents" },
								className: "btr-next-anchor",
								children: entry
							})
						}
						
						index = children.findIndex(x => x?.key === "Developer Stats")
						if(index !== -1) {
							const entry = children[index]
							delete entry.props.onClick
							
							children[index] = objects.jsx("a", {
								href: `/dashboard/creations/experiences/${args[0].creation.universeId}/stats`,
								style: { all: "unset", display: "contents" },
								className: "btr-next-anchor",
								children: entry
							})
						}
						
						index = children.findIndex(x => x?.key === "Action.CreateBadge")
						if(index !== -1) {
							const entry = children[index]
							delete entry.props.onClick
							
							children[index] = objects.jsx("a", {
								href: `/dashboard/creations/experiences/${args[0].creation.universeId}/badges/create`,
								style: { all: "unset", display: "contents" },
								className: "btr-next-anchor",
								children: entry
							})
						}
							
						children.splice(
							2, 0,
							objects.jsx("a", {
								href: `/dashboard/creations/experiences/${args[0].creation.universeId}/overview`,
								style: { all: "unset", display: "contents" },
								className: "btr-next-anchor",
								children: objects.jsx(objects.Mui.MenuItem, { children: "Configure Experience" })
							}),
							objects.jsx("a", {
								href: `/dashboard/creations/experiences/${args[0].creation.universeId}/places/${args[0].creation.assetId}/configure`,
								style: { all: "unset", display: "contents" },
								className: "btr-next-anchor",
								children: objects.jsx(objects.Mui.MenuItem, { children: "Configure Start Place" })
							}),
						)
					} else if(args[0].itemType === "CatalogAsset") {
						let index = children.findIndex(x => x?.key === "Action.OpenInNewTab")
						if(index !== -1) { children.splice(index, 1) }
							
						children.splice(
							0, 0,
							objects.jsx("a", {
								href: `https://www.roblox.com/catalog/${args[0].creation.assetId}/`,
								target: "_blank",
								style: { all: "unset", display: "contents" },
								children: objects.jsx(objects.Mui.MenuItem, { children: "View on Roblox" })
							}),
							objects.jsx("hr", {
								className: "MuiDivider-root"
							}),
							objects.jsx("a", {
								href: `/dashboard/creations/catalog/${args[0].creation.assetId}/configure`,
								style: { all: "unset", display: "contents" },
								className: "btr-next-anchor",
								children: objects.jsx(objects.Mui.MenuItem, { children: "Configure Asset" })
							})
						)
						
						index = children.findIndex(x => x?.key === "Action.CopyURL")
						if(index !== -1) { children.splice(index, 1) }
						
						index = children.findIndex(x => x?.props.children === "Copy Asset ID")
						if(index !== -1) { children.splice(index, 1) }
						
						index = children.findIndex(x => x?.props.children === "Copy Asset URI")
						if(index !== -1) { children.splice(index, 1) }
					}
				} else if(args[0]?.menuItems && args[0]?.setMenuOpen) {
					const parent = result.props.children?.[1]
					
					if(parent?.props) {
						const children = parent.props.children = [parent.props.children].flat(10)
						const assetDetail = children.find(x => x?.key === "open-asset-detail")
						
						if(assetDetail) {
							const assetId = assetDetail.props.assetId
							
							let index = children.indexOf(assetDetail)
							if(index !== -1) { children.splice(index, 1) }
							
							index = children.findIndex(x => x?.key === "copy-asset-id")
							if(index !== -1) { children.splice(index, 1) }
							
							children.unshift(
								objects.jsx("a", {
									href: `https://www.roblox.com/catalog/${assetId}/`,
									target: "_blank",
									style: { all: "unset", display: "contents" },
									children: objects.jsx(objects.Mui.MenuItem, { children: "View on Roblox" })
								}),
								objects.jsx("a", {
									href: `/marketplace/asset/${assetId}/`,
									target: "_blank",
									style: { all: "unset", display: "contents" },
									children: objects.jsx(objects.Mui.MenuItem, { children: "View in Marketplace" })
								}),
								objects.jsx(objects.Mui.Divider, {}),
								objects.jsx("a", {
									href: `/dashboard/creations/marketplace/${assetId}/configure`,
									style: { all: "unset", display: "contents" },
									className: "btr-next-anchor",
									children: objects.jsx(objects.Mui.MenuItem, { children: "Configure Asset" })
								})
							)
						}
					}
				}
			})
		})
		
	}
	
	// Add download option to version history
	if(SETTINGS.get("create.downloadVersion")) {
		InjectJS.inject(() => {
			BTRoblox.addReactHandler((args, result, objects) => {
				if(!result?.props) { return }
				
				try {
					if(result.props["data-testid"]?.startsWith("version-history")) {
						const version = args[0].version
						const right = result.props.children[3]
						
						if(!Array.isArray(right.props.children)) {
							right.props.children = [right.props.children]
						}
						
						right.props.children.unshift(
							objects.React.createElement(objects.Mui.Button, {
								className: "btr-download-version",
								btrVersion: version.assetVersionNumber,
								btrAssetId: version.assetId,
								size: "small",
								color: "secondary",
								children: [
									objects.React.createElement("span", {
										className: "btr-mui-circular-progress-root",
										style: {
											width: "20px",
											height: "20px",
											position: "absolute",
											left: "7px",
											display: "none"
										},
										children: objects.React.createElement("svg", {
											className: "btr-mui-circular-progress-svg",
											focusable: false,
											viewBox: "22 22 44 44",
											children: objects.React.createElement("circle", {
												className: "btr-mui-circular-progress",
												"stroke-width": 3.6,
												fill: "none",
												cx: 44,
												cy: 44,
												r: 20.2
											})
										})
									}),
									objects.React.createElement("svg", {
										className: "MuiSvgIcon-root btr-download-icon",
										focusable: false,
										viewBox: "0 0 24 24",
										style: {
											height: "19px",
											"margin-right": "5px"
										},
										children: objects.React.createElement("path", {
											d: "M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"
										})
									}),
									" ", "Download",,
								]
							})
						)
					}
				} catch(ex) {
					console.error(ex)
				}
			})
		})
		
		let isDownloading = false
		
		document.$on("click", ".btr-download-version", ev => {
			const button = ev.currentTarget
			
			const assetId = parseInt(button.getAttribute("btrAssetId"), 10)
			const assetVersionNumber = parseInt(button.getAttribute("btrVersion"), 10)
			
			if(!Number.isSafeInteger(assetId) || !Number.isSafeInteger(assetVersionNumber)) {
				return
			}
			
			if(isDownloading) { return }
			isDownloading = true
			
			button.$find(".btr-mui-circular-progress-root").style.display = ""
			button.$find(".btr-download-icon").style.opacity = "0"
			
			const placeNameRaw = document.title.match(/^(.*) \/ Version History$/)?.[1] ?? "place"
			const placeName = placeNameRaw.replace(/\W+/g, "-").replace(/^-+|-+$/g, "")
			const fileName = `${placeName}-${assetVersionNumber}.rbxl`
			
			const assetUrl = `https://assetdelivery.roblox.com/v1/asset/?id=${assetId}&version=${assetVersionNumber}`
			AssetCache.loadBuffer(assetUrl, buffer => {
				const blobUrl = URL.createObjectURL(new Blob([buffer], { type: "application/octet-stream" }))
				startDownload(blobUrl, fileName)
				URL.revokeObjectURL(blobUrl)
				
				isDownloading = false
				button.$find(".btr-mui-circular-progress-root").style.display = "none"
				button.$find(".btr-download-icon").style.opacity = ""
			})
		})
	}
}