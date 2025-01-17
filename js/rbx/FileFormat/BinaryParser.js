"use strict"

// http://www.classy-studios.com/Downloads/RobloxFileSpec.pdf

const RBXBinaryParser = {
	HeaderBytes: [0x3C, 0x72, 0x6F, 0x62, 0x6C, 0x6F, 0x78, 0x21, 0x89, 0xFF, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00],
	Faces: [[1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, 0, -1]],
	DataTypes: [
		null, "string", "bool", "int", "float", "double", "UDim", "UDim2", // 7
		"Ray", "Faces", "Axes", "BrickColor", "Color3", "Vector2", "Vector3", "Vector2int16", // 15
		"CFrame", "Quaternion", "Enum", "Instance", "Vector3int16", "NumberSequence", "ColorSequence", // 22
		"NumberRange", "Rect2D", "PhysicalProperties", "Color3uint8", "int64", "SharedString", "UnknownScriptFormat", // 29
		"Optional", "UniqueId"
	],

	parse(buffer) {
		const reader = new ByteReader(buffer)

		if(!reader.Match(this.HeaderBytes)) {
			THROW_DEV_WARNING("[ParseRBXBin] Header bytes did not match (Did binary format change?)")
		}

		const groupsCount = reader.UInt32LE()
		const instancesCount = reader.UInt32LE()
		reader.Jump(8)

		const parser = {
			result: new RBXInstanceRoot(),
			meta: {},
			sharedStrings: [],
			groups: new Array(groupsCount),
			instances: new Array(instancesCount)
		}
		
		this.arrayIndex = 0
		this.arrays = []
		
		for(let i = 0; i < 6; i++) {
			this.arrays.push(new Array(256))
		}
		
		const startIndex = reader.GetIndex()
		let bufferSize = 0
		
		while(reader.GetRemaining() >= 4) {
			const chunkType = reader.String(4)
			const comLength = reader.UInt32LE()
			const decomLength = reader.UInt32LE()
			
			if(comLength > 0) {
				reader.Jump(4 + comLength)
				
				if(decomLength > bufferSize) {
					bufferSize = decomLength
				}
			} else {
				reader.Jump(4 + decomLength)
			}
		}
		
		const chunkBuffer = new Uint8Array(bufferSize)
		reader.SetIndex(startIndex)

		while(reader.GetRemaining() >= 4) {
			const chunkType = reader.String(4)
			const chunkData = reader.LZ4(chunkBuffer)
			
			if(chunkType === "END\0") { break }
			
			const chunkReader = new ByteReader(chunkData)
			this.arrayIndex = 0

			switch(chunkType) {
			case "INST":
				this.parseINST(parser, chunkReader)
				break
			case "PROP":
				this.parsePROP(parser, chunkReader)
				break
			case "PRNT":
				this.parsePRNT(parser, chunkReader)
				break
			case "SSTR":
				this.parseSSTR(parser, chunkReader)
				break
			case "META":
				this.parseMETA(parser, chunkReader)
				break
				
			case "SIGN":
				break

			default:
				THROW_DEV_WARNING(`[ParseRBXBin] Unknown chunk '${chunkType}'`)
			}
		}

		if(reader.GetRemaining() > 0) {
			THROW_DEV_WARNING("[ParseRBXBin] Unexpected data after END")
		}
		
		this.arrays = null
		
		parser.result.meta = parser.meta
		return parser.result
	},

	parseMETA(parser, chunk) {
		const numEntries = chunk.UInt32LE()

		for(let i = 0; i < numEntries; i++) {
			const key = chunk.String(chunk.UInt32LE())
			const value = chunk.String(chunk.UInt32LE())
			parser.meta[key] = value
		}
	},
	
	parseSSTR(parser, chunk) {
		chunk.UInt32LE() // version
		const stringCount = chunk.UInt32LE()

		for(let i = 0; i < stringCount; i++) {
			const md5 = chunk.Array(16)
			const length = chunk.UInt32LE()
			const value = chunk.String(length)

			parser.sharedStrings[i] = { md5, value }
		}
	},

	parseINST(parser, chunk) {
		const groupId = chunk.UInt32LE()
		const className = chunk.String(chunk.UInt32LE())
		chunk.Byte() // isService
		const instCount = chunk.UInt32LE()
		const instIds = chunk.RBXInterleavedInt32(instCount, this.arrays[this.arrayIndex++])

		const group = parser.groups[groupId] = {
			ClassName: className,
			Objects: []
		}

		let instId = 0
		for(let i = 0; i < instCount; i++) {
			instId += instIds[i]
			group.Objects.push(parser.instances[instId] = RBXInstance.new(className))
		}
	},

	parsePROP(parser, chunk) {
		const group = parser.groups[chunk.UInt32LE()]
		const prop = chunk.String(chunk.UInt32LE())

		if(chunk.GetRemaining() <= 0) {
			return // empty chunk?
		}

		const instCount = group.Objects.length
		const values = this.arrays[this.arrayIndex++]
		
		let dataType = chunk.Byte()
		let typeName = this.DataTypes[dataType]
		
		let isOptional = typeName === "Optional"
		
		if(isOptional) {
			dataType = chunk.Byte()
			typeName = this.DataTypes[dataType]
		}
		
		let resultTypeName = typeName || "Unknown"

		switch(typeName) {
		case "string":
			for(let i = 0; i < instCount; i++) {
				const len = chunk.UInt32LE()
				values[i] = chunk.String(len)
			}
			break
		case "bool":
			for(let i = 0; i < instCount; i++) {
				values[i] = chunk.Byte() !== 0
			}
			break
		case "int":
			chunk.RBXInterleavedInt32(instCount, values)
			break
		case "float":
			chunk.RBXInterleavedFloat(instCount, values)
			break
		case "double":
			for(let i = 0; i < instCount; i++) {
				values[i] = chunk.DoubleLE()
			}
			break
		case "UDim": {
			const scale = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const offset = chunk.RBXInterleavedInt32(instCount, this.arrays[this.arrayIndex++])
			for(let i = 0; i < instCount; i++) {
				values[i] = [scale[i], offset[i]]
			}
			break
		}
		case "UDim2": {
			const scaleX = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const scaleY = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const offsetX = chunk.RBXInterleavedInt32(instCount, this.arrays[this.arrayIndex++])
			const offsetY = chunk.RBXInterleavedInt32(instCount, this.arrays[this.arrayIndex++])
			for(let i = 0; i < instCount; i++) {
				values[i] = [
					[scaleX[i], offsetX[i]],
					[scaleY[i], offsetY[i]]
				]
			}
			break
		}
		case "Ray": {
			for(let i = 0; i < instCount; i++) {
				values[i] = [
					[chunk.RBXFloatLE(), chunk.RBXFloatLE(), chunk.RBXFloatLE()],
					[chunk.RBXFloatLE(), chunk.RBXFloatLE(), chunk.RBXFloatLE()]
				]
			}
			break
		}
		case "Faces":
			for(let i = 0; i < instCount; i++) {
				const data = chunk.Byte()

				values[i] = {
					Right: !!(data & 1),
					Top: !!(data & 2),
					Back: !!(data & 4),
					Left: !!(data & 8),
					Bottom: !!(data & 16),
					Front: !!(data & 32)
				}
			}
			break
		case "Axes":
			for(let i = 0; i < instCount; i++) {
				const data = chunk.Byte()
				values[i] = {
					X: !!(data & 1),
					Y: !!(data & 2),
					Z: !!(data & 4)
				}
			}
			break
		case "BrickColor":
			chunk.RBXInterleavedUint32(instCount, values)
			break
		case "Color3": {
			const red = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const green = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const blue = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			for(let i = 0; i < instCount; i++) {
				values[i] = [red[i], green[i], blue[i]]
			}
			break
		}
		case "Vector2": {
			const vecX = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const vecY = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			for(let i = 0; i < instCount; i++) {
				values[i] = [vecX[i], vecY[i]]
			}
			break
		}
		case "Vector3": {
			const vecX = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const vecY = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const vecZ = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			for(let i = 0; i < instCount; i++) {
				values[i] = [vecX[i], vecY[i], vecZ[i]]
			}
			break
		}
		case "Vector2int16": break // Not used anywhere?
		case "CFrame": {
			for(let vi = 0; vi < instCount; vi++) {
				const value = values[vi] = [0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]
				const type = chunk.Byte()

				if(type !== 0) {
					const right = this.Faces[Math.floor((type - 1) / 6)]
					const up = this.Faces[Math.floor(type - 1) % 6]
					const back = [
						right[1] * up[2] - up[1] * right[2],
						right[2] * up[0] - up[2] * right[0],
						right[0] * up[1] - up[0] * right[1]
					]

					for(let i = 0; i < 3; i++) {
						value[3 + i * 3] = right[i]
						value[4 + i * 3] = up[i]
						value[5 + i * 3] = back[i]
					}
				} else {
					for(let i = 0; i < 9; i++) {
						value[i + 3] = chunk.FloatLE()
					}
				}
			}

			const vecX = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const vecY = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const vecZ = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			for(let i = 0; i < instCount; i++) {
				values[i][0] = vecX[i]
				values[i][1] = vecY[i]
				values[i][2] = vecZ[i]
			}
			break
		}
		// case "Quaternion": break // Not used anywhere?
		case "Enum":
			chunk.RBXInterleavedUint32(instCount, values)
			break
		case "Instance": {
			const refIds = chunk.RBXInterleavedInt32(instCount, this.arrays[this.arrayIndex++])

			let refId = 0
			for(let i = 0; i < instCount; i++) {
				refId += refIds[i]
				values[i] = parser.instances[refId]
			}
			break
		}
		case "Vector3int16":
			break // Not used anywhere?
		case "NumberSequence": {
			for(let i = 0; i < instCount; i++) {
				const seqLength = chunk.UInt32LE()
				const seq = values[i] = []

				for(let j = 0; j < seqLength; j++) {
					seq.push({
						Time: chunk.FloatLE(),
						Value: chunk.FloatLE(),
						Envelope: chunk.FloatLE()
					})
				}
			}
			break
		}
		case "ColorSequence":
			for(let i = 0; i < instCount; i++) {
				const seqLength = chunk.UInt32LE()
				const seq = values[i] = []

				for(let j = 0; j < seqLength; j++) {
					seq.push({
						Time: chunk.FloatLE(),
						Color: [chunk.FloatLE(), chunk.FloatLE(), chunk.FloatLE()],
						EnvelopeMaybe: chunk.FloatLE()
					})
				}
			}
			break
		case "NumberRange":
			for(let i = 0; i < instCount; i++) {
				values[i] = {
					Min: chunk.FloatLE(),
					Max: chunk.FloatLE()
				}
			}
			break
		case "Rect2D": {
			const x0 = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const y0 = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const x1 = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])
			const y1 = chunk.RBXInterleavedFloat(instCount, this.arrays[this.arrayIndex++])

			for(let i = 0; i < instCount; i++) {
				values[i] = [x0[i], y0[i], x1[i], y1[i]]
			}
			break
		}
		case "PhysicalProperties":
			for(let i = 0; i < instCount; i++) {
				const enabled = chunk.Byte() !== 0
				values[i] = {
					CustomPhysics: enabled,
					Density: enabled ? chunk.RBXFloatLE() : null,
					Friction: enabled ? chunk.RBXFloatLE() : null,
					Elasticity: enabled ? chunk.RBXFloatLE() : null,
					FrictionWeight: enabled ? chunk.RBXFloatLE() : null,
					ElasticityWeight: enabled ? chunk.RBXFloatLE() : null
				}
			}
			break
		case "Color3uint8": {
			const rgb = chunk.Array(instCount * 3)

			for(let i = 0; i < instCount; i++) {
				values[i] = [rgb[i] / 255, rgb[i + instCount] / 255, rgb[i + instCount * 2] / 255]
			}
			
			resultTypeName = "Color3"
			break
		}
		case "int64": { // Two's complement
			const bytes = chunk.Array(instCount * 8)

			for(let i = 0; i < instCount; i++) {
				let byte0 = bytes[i + instCount * 0] * (256 ** 3) + bytes[i + instCount * 1] * (256 ** 2) +
							bytes[i + instCount * 2] * 256 + bytes[i + instCount * 3]
				
				let byte1 = bytes[i + instCount * 4] * (256 ** 3) + bytes[i + instCount * 5] * (256 ** 2) +
							bytes[i + instCount * 6] * 256 + bytes[i + instCount * 7]
				
				const neg = byte1 % 2
				byte1 = (byte0 % 2) * (2 ** 31) + (byte1 + neg) / 2
				byte0 = Math.floor(byte0 / 2)

				if(byte0 < 2097152) {
					const value = byte0 * (256 ** 4) + byte1
					values[i] = String(neg ? -value : value)
				} else { // Slow path
					let result = ""

					while(byte1 || byte0) {
						const cur0 = byte0
						const res0 = cur0 % 10
						byte0 = (cur0 - res0) / 10

						const cur1 = byte1 + res0 * (256 ** 4)
						const res1 = cur1 % 10
						byte1 = (cur1 - res1) / 10

						result = res1 + result
					}

					values[i] = (neg ? "-" : "") + (result || "0")
				}
			}
			break
		}
		case "SharedString": {
			const indices = chunk.RBXInterleavedUint32(instCount, this.arrays[this.arrayIndex++])

			for(let i = 0; i < instCount; i++) {
				values[i] = parser.sharedStrings[indices[i]].value
			}
			break
		}
		case "UniqueId": {
			const bytes = chunk.Array(instCount * 16)
			
			for(let i = 0; i < instCount; i++) {
				let result = ""
				
				for(let j = 0; j < 16; j++) {
					const byte = bytes[j * instCount + i]
					result += ("0" + byte.toString(16)).slice(-2)
				}
				
				values[i] = result
			}
			break
		}
		default:
			if(IS_DEV_MODE) {
				if(!typeName) {
					console.warn(`[ParseRBXBin] Unknown dataType 0x${dataType.toString(16).toUpperCase()} (${dataType}) for ${group.ClassName}.${prop}`)
				} else {
					console.warn(`[ParseRBXBin] Unimplemented dataType '${typeName}' for ${group.ClassName}.${prop}`)
				}
			}
			// break omitted
		case "UnknownScriptFormat":
			for(let i = 0; i < instCount; i++) {
				values[i] = `<${typeName || "Unknown"}>`
			}
			break
		}
		
		if(isOptional) {
			if(this.DataTypes[chunk.Byte()] !== "bool" || chunk.GetRemaining() !== instCount) {
				console.warn(`[ParseRBXBin] Missing byte array at end of optional`)
				
				isOptional = false
				for(let i = 0; i < instCount; i++) {
					values[i] = `<Optional>`
				}
			}
		}
		
		for(let index = 0; index < instCount; index++) {
			if(isOptional) {
				if(chunk.Byte() === 0) {
					continue
				}
			}
			
			group.Objects[index].setProperty(prop, values[index], resultTypeName)
		}
	},

	parsePRNT(parser, chunk) {
		chunk.Byte()
		const parentCount = chunk.UInt32LE()
		const childIds = chunk.RBXInterleavedInt32(parentCount, this.arrays[this.arrayIndex++])
		const parentIds = chunk.RBXInterleavedInt32(parentCount, this.arrays[this.arrayIndex++])

		let childId = 0
		let parentId = 0
		for(let i = 0; i < parentCount; i++) {
			childId += childIds[i]
			parentId += parentIds[i]

			const child = parser.instances[childId]
			if(parentId === -1) {
				parser.result.push(child)
			} else {
				child.setProperty("Parent", parser.instances[parentId], "Instance")
			}
		}
	}
}