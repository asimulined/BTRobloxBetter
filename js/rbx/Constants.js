"use strict"

const AssetType = {
	Image: 1,
	TShirt: 2,
	Audio: 3,
	Mesh: 4,
	Lua: 5,
	Hat: 8,
	Place: 9,
	Model: 10,
	Shirt: 11,
	Pants: 12,
	Decal: 13,
	Head: 17,
	Face: 18,
	Gear: 19,
	Badge: 21,
	Animation: 24,
	Torso: 27,
	RightArm: 28,
	LeftArm: 29,
	LeftLeg: 30,
	RightLeg: 31,
	Package: 32,
	GamePass: 34,
	Plugin: 38,
	MeshPart: 40,
	HairAccessory: 41,
	FaceAccessory: 42,
	NeckAccessory: 43,
	ShoulderAccessory: 44,
	FrontAccessory: 45,
	BackAccessory: 46,
	WaistAccessory: 47,
	ClimbAnimation: 48,
	DeathAnimation: 49,
	FallAnimation: 50,
	IdleAnimation: 51,
	JumpAnimation: 52,
	RunAnimation: 53,
	SwimAnimation: 54,
	WalkAnimation: 55,
	PoseAnimation: 56,
	EarAccessory: 57,
	EyeAccessory: 58,
	EmoteAnimation: 61,
	Video: 62,
	TShirtAccessory: 64,
	ShirtAccessory: 65,
	PantsAccessory: 66,
	JacketAccessory: 67,
	SweaterAccessory: 68,
	ShortsAccessory: 69,
	LeftShoeAccessory: 70,
	RightShoeAccessory: 71,
	DressSkirtAccessory: 72,
	EyebrowAccessory: 76,
	EyelashAccessory: 77,
	MoodAnimation: 78,
	DynamicHead: 79
}

const BrickColor = {
	1: { name: "White", color: [242, 243, 243] },
	2: { name: "Grey", color: [161, 165, 162] },
	3: { name: "Light yellow", color: [249, 233, 153] },
	5: { name: "Brick yellow", color: [215, 197, 154] },
	6: { name: "Light green (Mint)", color: [194, 218, 184] },
	9: { name: "Light reddish violet", color: [232, 186, 200] },
	11: { name: "Pastel Blue", color: [128, 187, 219] },
	12: { name: "Light orange brown", color: [203, 132, 66] },
	18: { name: "Nougat", color: [204, 142, 105] },
	21: { name: "Bright red", color: [196, 40, 28] },
	22: { name: "Med. reddish violet", color: [196, 112, 160] },
	23: { name: "Bright blue", color: [13, 105, 172] },
	24: { name: "Bright yellow", color: [245, 205, 48] },
	25: { name: "Earth orange", color: [98, 71, 50] },
	26: { name: "Black", color: [27, 42, 53] },
	27: { name: "Dark grey", color: [109, 110, 108] },
	28: { name: "Dark green", color: [40, 127, 71] },
	29: { name: "Medium green", color: [161, 196, 140] },
	36: { name: "Lig. Yellowich orange", color: [243, 207, 155] },
	37: { name: "Bright green", color: [75, 151, 75] },
	38: { name: "Dark orange", color: [160, 95, 53] },
	39: { name: "Light bluish violet", color: [193, 202, 222] },
	40: { name: "Transparent", color: [236, 236, 236] },
	41: { name: "Tr. Red", color: [205, 84, 75] },
	42: { name: "Tr. Lg blue", color: [193, 223, 240] },
	43: { name: "Tr. Blue", color: [123, 182, 232] },
	44: { name: "Tr. Yellow", color: [247, 241, 141] },
	45: { name: "Light blue", color: [180, 210, 228] },
	47: { name: "Tr. Flu. Reddish orange", color: [217, 133, 108] },
	48: { name: "Tr. Green", color: [132, 182, 141] },
	49: { name: "Tr. Flu. Green", color: [248, 241, 132] },
	50: { name: "Phosph. White", color: [236, 232, 222] },
	100: { name: "Light red", color: [238, 196, 182] },
	101: { name: "Medium red", color: [218, 134, 122] },
	102: { name: "Medium blue", color: [110, 153, 202] },
	103: { name: "Light grey", color: [199, 193, 183] },
	104: { name: "Bright violet", color: [107, 50, 124] },
	105: { name: "Br. yellowish orange", color: [226, 155, 64] },
	106: { name: "Bright orange", color: [218, 133, 65] },
	107: { name: "Bright bluish green", color: [0, 143, 156] },
	108: { name: "Earth yellow", color: [104, 92, 67] },
	110: { name: "Bright bluish violet", color: [67, 84, 147] },
	111: { name: "Tr. Brown", color: [191, 183, 177] },
	112: { name: "Medium bluish violet", color: [104, 116, 172] },
	113: { name: "Tr. Medi. reddish violet", color: [229, 173, 200] },
	115: { name: "Med. yellowish green", color: [199, 210, 60] },
	116: { name: "Med. bluish green", color: [85, 165, 175] },
	118: { name: "Light bluish green", color: [183, 215, 213] },
	119: { name: "Br. yellowish green", color: [164, 189, 71] },
	120: { name: "Lig. yellowish green", color: [217, 228, 167] },
	121: { name: "Med. yellowish orange", color: [231, 172, 88] },
	123: { name: "Br. reddish orange", color: [211, 111, 76] },
	124: { name: "Bright reddish violet", color: [146, 57, 120] },
	125: { name: "Light orange", color: [234, 184, 146] },
	126: { name: "Tr. Bright bluish violet", color: [165, 165, 203] },
	127: { name: "Gold", color: [220, 188, 129] },
	128: { name: "Dark nougat", color: [174, 122, 89] },
	131: { name: "Silver", color: [156, 163, 168] },
	133: { name: "Neon orange", color: [213, 115, 61] },
	134: { name: "Neon green", color: [216, 221, 86] },
	135: { name: "Sand blue", color: [116, 134, 157] },
	136: { name: "Sand violet", color: [135, 124, 144] },
	137: { name: "Medium orange", color: [224, 152, 100] },
	138: { name: "Sand yellow", color: [149, 138, 115] },
	140: { name: "Earth blue", color: [32, 58, 86] },
	141: { name: "Earth green", color: [39, 70, 45] },
	143: { name: "Tr. Flu. Blue", color: [207, 226, 247] },
	145: { name: "Sand blue metallic", color: [121, 136, 161] },
	146: { name: "Sand violet metallic", color: [149, 142, 163] },
	147: { name: "Sand yellow metallic", color: [147, 135, 103] },
	148: { name: "Dark grey metallic", color: [87, 88, 87] },
	149: { name: "Black metallic", color: [22, 29, 50] },
	150: { name: "Light grey metallic", color: [171, 173, 172] },
	151: { name: "Sand green", color: [120, 144, 130] },
	153: { name: "Sand red", color: [149, 121, 119] },
	154: { name: "Dark red", color: [123, 46, 47] },
	157: { name: "Tr. Flu. Yellow", color: [255, 246, 123] },
	158: { name: "Tr. Flu. Red", color: [225, 164, 194] },
	168: { name: "Gun metallic", color: [117, 108, 98] },
	176: { name: "Red flip/flop", color: [151, 105, 91] },
	178: { name: "Yellow flip/flop", color: [180, 132, 85] },
	179: { name: "Silver flip/flop", color: [137, 135, 136] },
	180: { name: "Curry", color: [215, 169, 75] },
	190: { name: "Fire Yellow", color: [249, 214, 46] },
	191: { name: "Flame yellowish orange", color: [232, 171, 45] },
	192: { name: "Reddish brown", color: [105, 64, 40] },
	193: { name: "Flame reddish orange", color: [207, 96, 36] },
	194: { name: "Medium stone grey", color: [163, 162, 165] },
	195: { name: "Royal blue", color: [70, 103, 164] },
	196: { name: "Dark Royal blue", color: [35, 71, 139] },
	198: { name: "Bright reddish lilac", color: [142, 66, 133] },
	199: { name: "Dark stone grey", color: [99, 95, 98] },
	200: { name: "Lemon metalic", color: [130, 138, 93] },
	208: { name: "Light stone grey", color: [229, 228, 223] },
	209: { name: "Dark Curry", color: [176, 142, 68] },
	210: { name: "Faded green", color: [112, 149, 120] },
	211: { name: "Turquoise", color: [121, 181, 181] },
	212: { name: "Light Royal blue", color: [159, 195, 233] },
	213: { name: "Medium Royal blue", color: [108, 129, 183] },
	216: { name: "Rust", color: [144, 76, 42] },
	217: { name: "Brown", color: [124, 92, 70] },
	218: { name: "Reddish lilac", color: [150, 112, 159] },
	219: { name: "Lilac", color: [107, 98, 155] },
	220: { name: "Light lilac", color: [167, 169, 206] },
	221: { name: "Bright purple", color: [205, 98, 152] },
	222: { name: "Light purple", color: [228, 173, 200] },
	223: { name: "Light pink", color: [220, 144, 149] },
	224: { name: "Light brick yellow", color: [240, 213, 160] },
	225: { name: "Warm yellowish orange", color: [235, 184, 127] },
	226: { name: "Cool yellow", color: [253, 234, 141] },
	232: { name: "Dove blue", color: [125, 187, 221] },
	268: { name: "Medium lilac", color: [52, 43, 117] },
	301: { name: "Slime green", color: [80, 109, 84] },
	302: { name: "Smoky grey", color: [91, 93, 105] },
	303: { name: "Dark blue", color: [0, 16, 176] },
	304: { name: "Parsley green", color: [44, 101, 29] },
	305: { name: "Steel blue", color: [82, 124, 174] },
	306: { name: "Storm blue", color: [51, 88, 130] },
	307: { name: "Lapis", color: [16, 42, 220] },
	308: { name: "Dark indigo", color: [61, 21, 133] },
	309: { name: "Sea green", color: [52, 142, 64] },
	310: { name: "Shamrock", color: [91, 154, 76] },
	311: { name: "Fossil", color: [159, 161, 172] },
	312: { name: "Mulberry", color: [89, 34, 89] },
	313: { name: "Forest green", color: [31, 128, 29] },
	314: { name: "Cadet blue", color: [159, 173, 192] },
	315: { name: "Electric blue", color: [9, 137, 207] },
	316: { name: "Eggplant", color: [123, 0, 123] },
	317: { name: "Moss", color: [124, 156, 107] },
	318: { name: "Artichoke", color: [138, 171, 133] },
	319: { name: "Sage green", color: [185, 196, 177] },
	320: { name: "Ghost grey", color: [202, 203, 209] },
	321: { name: "Lilac", color: [167, 94, 155] },
	322: { name: "Plum", color: [123, 47, 123] },
	323: { name: "Olivine", color: [148, 190, 129] },
	324: { name: "Laurel green", color: [168, 189, 153] },
	325: { name: "Quill grey", color: [223, 223, 222] },
	327: { name: "Crimson", color: [151, 0, 0] },
	328: { name: "Mint", color: [177, 229, 166] },
	329: { name: "Baby blue", color: [152, 194, 219] },
	330: { name: "Carnation pink", color: [255, 152, 220] },
	331: { name: "Persimmon", color: [255, 89, 89] },
	332: { name: "Maroon", color: [117, 0, 0] },
	333: { name: "Gold", color: [239, 184, 56] },
	334: { name: "Daisy orange", color: [248, 217, 109] },
	335: { name: "Pearl", color: [231, 231, 236] },
	336: { name: "Fog", color: [199, 212, 228] },
	337: { name: "Salmon", color: [255, 148, 148] },
	338: { name: "Terra Cotta", color: [190, 104, 98] },
	339: { name: "Cocoa", color: [86, 36, 36] },
	340: { name: "Wheat", color: [241, 231, 199] },
	341: { name: "Buttermilk", color: [254, 243, 187] },
	342: { name: "Mauve", color: [224, 178, 208] },
	343: { name: "Sunrise", color: [212, 144, 189] },
	344: { name: "Tawny", color: [150, 85, 85] },
	345: { name: "Rust", color: [143, 76, 42] },
	346: { name: "Cashmere", color: [211, 190, 150] },
	347: { name: "Khaki", color: [226, 220, 188] },
	348: { name: "Lily white", color: [237, 234, 234] },
	349: { name: "Seashell", color: [233, 218, 218] },
	350: { name: "Burgundy", color: [136, 62, 62] },
	351: { name: "Cork", color: [188, 155, 93] },
	352: { name: "Burlap", color: [199, 172, 120] },
	353: { name: "Beige", color: [202, 191, 163] },
	354: { name: "Oyster", color: [187, 179, 178] },
	355: { name: "Pine Cone", color: [108, 88, 75] },
	356: { name: "Fawn brown", color: [160, 132, 79] },
	357: { name: "Hurricane grey", color: [149, 137, 136] },
	358: { name: "Cloudy grey", color: [171, 168, 158] },
	359: { name: "Linen", color: [175, 148, 131] },
	360: { name: "Copper", color: [150, 103, 102] },
	361: { name: "Medium brown", color: [86, 66, 54] },
	362: { name: "Bronze", color: [126, 104, 63] },
	363: { name: "Flint", color: [105, 102, 92] },
	364: { name: "Dark taupe", color: [90, 76, 66] },
	365: { name: "Burnt Sienna", color: [106, 57, 9] },
	1001: { name: "Institutional white", color: [248, 248, 248] },
	1002: { name: "Mid gray", color: [205, 205, 205] },
	1003: { name: "Really black", color: [17, 17, 17] },
	1004: { name: "Really red", color: [255, 0, 0] },
	1005: { name: "Deep orange", color: [255, 176, 0] },
	1006: { name: "Alder", color: [180, 128, 255] },
	1007: { name: "Dusty Rose", color: [163, 75, 75] },
	1008: { name: "Olive", color: [193, 190, 66] },
	1009: { name: "New Yeller", color: [255, 255, 0] },
	1010: { name: "Really blue", color: [0, 0, 255] },
	1011: { name: "Navy blue", color: [0, 32, 96] },
	1012: { name: "Deep blue", color: [33, 84, 185] },
	1013: { name: "Cyan", color: [4, 175, 236] },
	1014: { name: "CGA brown", color: [170, 85, 0] },
	1015: { name: "Magenta", color: [170, 0, 170] },
	1016: { name: "Pink", color: [255, 102, 204] },
	1017: { name: "Deep orange", color: [255, 175, 0] },
	1018: { name: "Teal", color: [18, 238, 212] },
	1019: { name: "Toothpaste", color: [0, 255, 255] },
	1020: { name: "Lime green", color: [0, 255, 0] },
	1021: { name: "Camo", color: [58, 125, 21] },
	1022: { name: "Grime", color: [127, 142, 100] },
	1023: { name: "Lavender", color: [140, 91, 159] },
	1024: { name: "Pastel light blue", color: [175, 221, 255] },
	1025: { name: "Pastel orange", color: [255, 201, 201] },
	1026: { name: "Pastel violet", color: [177, 167, 255] },
	1027: { name: "Pastel blue-green", color: [159, 243, 233] },
	1028: { name: "Pastel green", color: [204, 255, 204] },
	1029: { name: "Pastel yellow", color: [255, 255, 204] },
	1030: { name: "Pastel brown", color: [255, 204, 153] },
	1031: { name: "Royal purple", color: [98, 37, 209] },
	1032: { name: "Hot pink", color: [255, 0, 191] }
}