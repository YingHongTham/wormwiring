## script to combine all obj files into one
##
## for vertices, simply append the list of vertices
## but since faces are determined by vertices
## need to bump the vertex number appropriately
## e.g. if one file is
## v 0 0 0
## v 1 1 1
## v 2 2 2
## f 1 2 3
## and another file is
## v 6 6 6
## v 7 7 7
## v 8 8 8
## f 1 2 3
## then the combined file should be
## v 0 0 0
## v 1 1 1
## v 2 2 2
## v 6 6 6
## v 7 7 7
## v 8 8 8
## f 1 2 3
## f 4 5 6
##
## we also just use the mtl of ADAL.mtl,
## so make sure to manually copy this to
## ALL_CELLS_COMBINED_{DB}.mtl

db = 'N2U'


PATH_TO_FOLDER = 'models/{}/'.format(db)

cells_N2U = ['ADAL', 'ADAR', 'ADEL', 'ADER', 'ADFL', 'ADFR', 'ADLL', 'ADLR', 'AFDL', 'AFDR', 'AIAL', 'AIAR', 'AIBL', 'AIBR', 'AIML', 'AIMR', 'AINL', 'AINR', 'AIYL', 'AIYR', 'AIZL', 'AIZR', 'ALA', 'ALML', 'ALMR', 'ALNL', 'ALNR', 'AQR', 'ASEL', 'ASER', 'ASGL', 'ASGR', 'ASHL', 'ASHR', 'ASIL', 'ASIR', 'ASJL', 'ASJR', 'ASKL', 'ASKR', 'AUAL', 'AUAR', 'AVAL', 'AVAR', 'AVBL', 'AVBR', 'AVDL', 'AVDR', 'AVEL', 'AVER', 'AVFL', 'AVFR', 'AVHL', 'AVHR', 'AVJL', 'AVJR', 'AVKL', 'AVKR', 'AVL', 'AVM', 'AWAL', 'AWAR', 'AWBL', 'AWBR', 'AWCL', 'AWCR', 'BAGL', 'BAGR', 'BDUL', 'BDUR', 'CEPDL', 'CEPDR', 'CEPVL', 'CEPVR', 'DVA', 'DVC', 'FLPL', 'FLPR', 'IL1DL', 'IL1DR', 'IL1L', 'IL1R', 'IL1VL', 'IL1VR', 'IL2DL', 'IL2DR', 'IL2L', 'IL2R', 'IL2VL', 'IL2VR', 'OLLL', 'OLLR', 'OLQDL', 'OLQDR', 'OLQVL', 'OLQVR', 'PLNL', 'PLNR', 'PVCL', 'PVCR', 'PVNL', 'PVNR', 'PVPL', 'PVPR', 'PVQL', 'PVQR', 'PVR', 'PVT', 'RIAL', 'RIAR', 'RIBL', 'RIBR', 'RICL', 'RICR', 'RID', 'RIFL', 'RIFR', 'RIGL', 'RIGR', 'RIH', 'RIML', 'RIMR', 'RIPL', 'RIPR', 'RIR', 'RIS', 'RIVL', 'RIVR', 'RMDDL', 'RMDDR', 'RMDL', 'RMDR', 'RMDVL', 'RMDVR', 'RMED', 'RMEL', 'RMER', 'RMEV', 'RMFL', 'RMFR', 'RMGL', 'RMGR', 'RMHL', 'RMHR', 'SAADL', 'SAADR', 'SAAVL', 'SAAVR', 'SDQL', 'SDQR', 'SIADL', 'SIADR', 'SIAVL', 'SIAVR', 'SIBDL', 'SIBDR', 'SIBVL', 'SIBVR', 'SMBDL', 'SMBDR', 'SMBVL', 'SMBVR', 'SMDDL', 'SMDDR', 'SMDVL', 'SMDVR', 'URADL', 'URADR', 'URAVL', 'URAVR', 'URBL', 'URBR', 'URXL', 'URXR', 'URYDL', 'URYDR', 'URYVL', 'URYVR']

cells_n2y = ['AILL', 'AS10', 'AS11', 'AVAL', 'AVAR', 'AVBL', 'AVBR', 'AVDL', 'AVDR', 'AVFL', 'AVFR', 'AVG', 'AVHL', 'AVHR', 'AVJL', 'AVJR', 'AVKL', 'AVKR', 'AVL', 'CA4', 'CA5', 'CA6', 'CA7', 'CA8', 'CA9', 'CP1', 'CP2', 'CP3', 'CP4', 'CP5', 'CP6', 'CP7', 'CP8', 'CP9', 'DA7', 'DA8', 'DA9', 'DB5', 'DB6', 'DB7', 'DD6', 'DVA', 'DVB', 'DVC', 'DVE', 'DVF', 'DX1', 'DX2', 'DX3', 'EF1', 'EF2', 'EF3', 'HOA', 'HOB', 'hyp', 'LUAL', 'LUAR', 'PCAL', 'PCAR', 'PCBL', 'PCBR', 'PCCL', 'PCCR', 'PDA', 'PDB', 'PDC', 'PDEL', 'PDER', 'PGA', 'PHAL', 'PHAR', 'PHBL', 'PHBR', 'PHCL', 'PHCR', 'PHDL', 'PHDR', 'PQR', 'PS10', 'PS11', 'PS12', 'PS13', 'PS14', 'PS15', 'PS16', 'PS17', 'PS18', 'PS19', 'PS1', 'PS20', 'PS21', 'PS22', 'PS23', 'PS24', 'PS25', 'PS26', 'PS27', 'PS28', 'PS29', 'PS2', 'PS30', 'PS31', 'PS32', 'PS33', 'PS34', 'PS35', 'PS36', 'PS37', 'PS38', 'PS39', 'PS3', 'PS40', 'PS41', 'PS42', 'PS43', 'PS44', 'PS45', 'PS46', 'PS47', 'PS48', 'PS49', 'PS4', 'PS50', 'PS5', 'PS6', 'PS7', 'PS8', 'PS9', 'PVCL', 'PVCR', 'PVDL', 'PVDR', 'PVNL', 'PVNR', 'PVQL', 'PVQR', 'PVR', 'PVS', 'PVT', 'PVU', 'PVV', 'PVWL', 'PVWR', 'PVX', 'PVY', 'PVZ', 'R1AL', 'R1BL', 'R1BR', 'R2AL', 'R2AR', 'R2BL', 'R2BR', 'R3AL', 'R3AR', 'R3BL', 'R3BR', 'R4AL', 'R4AR', 'R4BL', 'R4BR', 'R5AL', 'R5AR', 'R5BL', 'R5BR', 'R6AL', 'R6AR', 'R6BL', 'R6BR', 'R7AL', 'R7AR', 'R7BL', 'R7BR', 'R8AL', 'R8AR', 'R8BL', 'R8BR', 'R9AL', 'R9AR', 'R9BL', 'R9BR', 'SE1', 'SE2', 'SE3', 'SE4', 'SE5', 'SE6', 'SPCL', 'SPCR', 'SPDL', 'SPDR', 'SPVL', 'SPVR', 'VA10', 'VA11', 'VA12', 'VB06', 'VB07', 'VB08', 'VB09', 'VB10', 'VB11', 'VD11', 'VD12', 'VD13']

cells_JSH = ['ADAL', 'ADAR', 'ADEL', 'ADER', 'ADFL', 'ADFR', 'ADLL', 'ADLR', 'AFDL', 'AFDR', 'AIAL', 'AIAR', 'AIBL', 'AIBR', 'AIML', 'AIMR', 'AINL', 'AINR', 'AIYL', 'AIYR', 'AIZL', 'AIZR', 'ALA', 'ALML', 'ALMR', 'ALNL', 'ALNR', 'AQR', 'ASEL', 'ASER', 'ASGL', 'ASGR', 'ASHL', 'ASHR', 'ASIL', 'ASIR', 'ASJL', 'ASJR', 'ASKL', 'ASKR', 'AUAL', 'AUAR', 'AVAL', 'AVAR', 'AVBL', 'AVBR', 'AVDL', 'AVDR', 'AVEL', 'AVER', 'AVFL', 'AVFR', 'AVHL', 'AVHR', 'AVJL', 'AVJR', 'AVKL', 'AVKR', 'AVL', 'AVM', 'AWAL', 'AWAR', 'AWBL', 'AWBR', 'AWCL', 'AWCR', 'BAGL', 'BAGR', 'BDUL', 'BDUR', 'CEPDL', 'CEPDR', 'CEPVL', 'CEPVR', 'DVA', 'DVC', 'FLPL', 'FLPR', 'HSNR', 'IL1DL', 'IL1DR', 'IL1L', 'IL1R', 'IL1VL', 'IL1VR', 'IL2DL', 'IL2DR', 'IL2L', 'IL2R', 'IL2VL', 'IL2VR', 'OLLL', 'OLLR', 'OLQDL', 'OLQDR', 'OLQVL', 'OLQVR', 'PLNL', 'PLNR', 'PVCL', 'PVCR', 'PVNL', 'PVPL', 'PVPR', 'PVQL', 'PVQR', 'PVR', 'PVT', 'RIAL', 'RIAR', 'RIBL', 'RIBR', 'RICL', 'RICR', 'RID', 'RIFL', 'RIFR', 'RIGL', 'RIGR', 'RIH', 'RIML', 'RIMR', 'RIPL', 'RIPR', 'RIR', 'RIS', 'RIVL', 'RIVR', 'RMDDL', 'RMDDR', 'RMDL', 'RMDR', 'RMDVL', 'RMDVR', 'RMED', 'RMEL', 'RMER', 'RMEV', 'RMFL', 'RMFR', 'RMGL', 'RMGR', 'RMHL', 'RMHR', 'SAADL', 'SAADR', 'SAAVL', 'SAAVR', 'SABD', 'SDQL', 'SDQR', 'SIADL', 'SIADR', 'SIAVL', 'SIAVR', 'SIBDL', 'SIBDR', 'SIBVL', 'SIBVR', 'SMBDL', 'SMBDR', 'SMBVL', 'SMBVR', 'SMDDL', 'SMDDR', 'SMDVL', 'SMDVR', 'URADL', 'URADR', 'URAVL', 'URAVR', 'URBL', 'URBR', 'URXL', 'URXR', 'URYDL', 'URYDR', 'URYVL', 'URYVR']


if (db == 'N2U'):
	cells = cells_N2U
elif (db == 'n2y'):
	cells = cells_n2y
elif (db == 'JSH'):
	cells = cells_JSH
else:
	print("db given is invalid, must be 'N2U', 'n2y', or 'JSH'")

vertices = { c : [] for c in cells }
faces = { c : [] for c in cells }

vertices_ADAL = []
faces_ADAL = []
vertices_ADAR = []
faces_ADAR = []

for c in cells:
	obj_file_name = PATH_TO_FOLDER + c + '.obj'
	with open(obj_file_name) as f:
		lines = f.readlines()

		for l in lines:
			if l[:2] == 'v ':
				#note: l contains the newline character
				vertices[c].append(l)
	#
			if l[:2] == 'f ':
				#note: faces refer to vertices starting index 1
				l_split = l.split()
				faces[c].append((int(l_split[1]), int(l_split[2]), int(l_split[3])))


vert_counter = 0
cell_counter = 0 # for the smoothing group s1, s2, etc

output_file = '{}ALL_CELLS_COMBINED_{}.obj'.format(PATH_TO_FOLDER, db)

with open(output_file,'w') as writer:
	writer.write('# OBJ File\n')
	writer.write('mtllib ALL_CELLS_COMBINED_N2U.mtl\n')
	writer.write('g ALL_CELLS_COMBINED_N2U\n')
#
	for c in cells:
		for v in vertices[c]:
			writer.write(v) #already contains newline char
# faces
	writer.write('usemtl mat_51\n')
#
	for c in cells:
		cell_counter += 1
		writer.write('s{}\n'.format(cell_counter))
#
		for f in faces[c]:
			writer.write('f {} {} {}\n'.format(f[0]+vert_counter, f[1]+vert_counter, f[2]+vert_counter))
		vert_counter += len(vertices[c])

