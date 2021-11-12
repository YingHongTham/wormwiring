//writes the updates column on the left
//weird that we include it on non-home pages but OK

<div class="content">
	<div class="row">
		<div class="column leftnews" style="background-color:#ccc">
			<h3>Updates and News</h3>
			<div data-include="news/news.html"></div>
		</div>
		<div class="column middle">
			<!--<span title="Interactive Diagram [.pdf]">
			<a href="papers/Interactive-Diagram.pdf">-->
				<img style= "width:100%" src="art1/connectome_small.PNG" alt="connectome"/>
			<!--</a>
			</span>-->
		<p>&emsp;&emsp;&emsp;<button onclick="location.href='pages/interactive.html'" type="button" class="btn">Interactive Diagram</button></p>
  </div>
  <div class="column right">
    <p>A website hosting nematode connectomics data and tools for its visualization and analysis.</p>
		<h3><i>Caenorhabditis elegans</i></h3>
		<p>&emsp;&emsp;&emsp;<button onclick="location.href='pages/adjacency.html'" type="button" class="btn">Adjacency Matrices and Data Tables</button></p>
  	  	<p>&emsp;&emsp;&emsp;<button onclick="location.href='apps/neuronMaps/'" type="button" class="btn">Skeleton Neuron Diagrams</button></p>
	  	<p>&emsp;&emsp;&emsp;<button onclick="location.href='apps/neuronVolume/'" type="button" class="btn">Volumetric Viewer</button></p>
	  	<p>&emsp;&emsp;&emsp;<button onclick="location.href='apps/listViewer/?listtype=partners'" type="button" class="btn">Partner List</button></p>
	  	<p>&emsp;&emsp;&emsp;<button onclick="location.href='apps/listViewer/?listtype=synapse'" type="button" class="btn">Synapse List</button></p>
	  	<p>&emsp;&emsp;&emsp;<button onclick="location.href='si/SI 10 Properties of reconstructions.xlsx'" type="button" class="btn">Properties of Reconstruction Series [.xlsx]</button></p>
	  	<p>&emsp;&emsp;&emsp;<button onclick="location.href='pages/network diagrams.html'" type="button" class="btn">Network Diagrams</button></p>
  </div>
</div>
</div>

