document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const processingSection = document.getElementById('processingSection');
    const resultsSection = document.getElementById('resultsSection');
    const progressBar = document.getElementById('progressBar');
    const statusText = document.getElementById('statusText');

    // API endpoint
    const API_URL = 'https://ai-book-summary-api.onrender.com';  // Update this with your Render URL

    // Handle drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        handleFile(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFile(e.target.files[0]);
    });

    function handleFile(file) {
        if (!file || file.type !== 'text/plain') {
            alert('Please upload a valid text file.');
            return;
        }

        fileInfo.textContent = `Selected file: ${file.name}`;
        uploadAndProcess(file);
    }

    async function uploadAndProcess(file) {
        try {
            processingSection.style.display = 'block';
            resultsSection.style.display = 'none';
            progressBar.style.width = '0%';
            statusText.textContent = 'Uploading file...';

            // Create form data
            const formData = new FormData();
            formData.append('file', file);

            // First check if the API is available
            try {
                const healthCheck = await fetch(`${API_URL}/health`);
                if (!healthCheck.ok) {
                    throw new Error('Backend service is not available');
                }
            } catch (error) {
                throw new Error('Cannot connect to backend service. Please try again later.');
            }

            // Upload file
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData,
                mode: 'cors',
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server error: ${errorText}`);
            }

            progressBar.style.width = '50%';
            statusText.textContent = 'Processing text...';

            const result = await response.json();
            console.log('Response:', result); // Add logging

            if (!result || !result.summary || !result.entities) {
                throw new Error('Invalid response format from server');
            }

            // Display results
            progressBar.style.width = '100%';
            statusText.textContent = 'Complete!';
            displayResults(result);

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = `Error: ${error.message}`;
            progressBar.style.width = '0%';
            progressBar.style.backgroundColor = '#ff4444';
        }
    }

    function displayResults(result) {
        if (!result || !result.summary || !result.entities) {
            console.error('Invalid result format:', result);
            return;
        }

        processingSection.style.display = 'none';
        resultsSection.style.display = 'block';

        // Display summary
        const summaryContent = document.getElementById('summaryContent');
        if (summaryContent) {
            summaryContent.textContent = result.summary;
        }

        // Display key phrases
        const keyPhrasesContent = document.getElementById('keyPhrasesContent');
        if (keyPhrasesContent && Array.isArray(result.entities)) {
            keyPhrasesContent.innerHTML = result.entities
                .map(entity => `<div class="key-phrase">
                    <span class="phrase">${entity.text}</span>
                    <span class="type">${entity.type}</span>
                </div>`)
                .join('');
        }

        // Create mindmap visualization if we have entities
        if (Array.isArray(result.entities) && result.entities.length > 0) {
            createMindmap(result.entities);
        }
    }

    function createMindmap(entities) {
        const width = 1200;
        const height = 800;
        const centerX = width / 2;
        const centerY = height / 2;

        // Clear previous visualization
        const mindmapVisualization = document.getElementById('mindmapVisualization');
        if (!mindmapVisualization) return;
        mindmapVisualization.innerHTML = '';

        // Create SVG with zoom capability
        const svg = d3.select('#mindmapVisualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('style', 'max-width: 100%; height: auto; background-color: #f8f9fa;');

        // Add zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([0.5, 2])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Create a group for all elements
        const g = svg.append('g');

        // Group entities by type
        const groupedEntities = {};
        entities.forEach(entity => {
            if (!groupedEntities[entity.type]) {
                groupedEntities[entity.type] = [];
            }
            groupedEntities[entity.type].push(entity);
        });

        // Calculate positions for type nodes
        const typeKeys = Object.keys(groupedEntities);
        const typeRadius = 250; // Distance from center to type nodes
        const typeNodes = typeKeys.map((type, index) => {
            const angle = (index * 2 * Math.PI / typeKeys.length) - Math.PI / 2;
            return {
                id: `type-${index}`,
                text: type,
                type: 'TYPE',
                x: centerX + Math.cos(angle) * typeRadius,
                y: centerY + Math.sin(angle) * typeRadius,
                angle: angle
            };
        });

        // Calculate positions for entity nodes
        const entityNodes = [];
        const entityRadius = 150; // Distance from type node to entity nodes
        typeNodes.forEach((typeNode, typeIndex) => {
            const typeEntities = groupedEntities[typeNode.text];
            typeEntities.forEach((entity, entityIndex) => {
                const segment = 2 * Math.PI / typeEntities.length;
                const angle = typeNode.angle - Math.PI/4 + segment * entityIndex;
                entityNodes.push({
                    id: `entity-${entityIndex}-${typeIndex}`,
                    text: entity.text,
                    type: 'ENTITY',
                    parentType: typeNode.text,
                    x: typeNode.x + Math.cos(angle) * entityRadius,
                    y: typeNode.y + Math.sin(angle) * entityRadius
                });
            });
        });

        // Create center node
        const centerNode = {
            id: 'center',
            text: 'Book\nSummary',
            type: 'CENTER',
            x: centerX,
            y: centerY
        };

        // Create curved links
        const links = [
            // Links from center to type nodes
            ...typeNodes.map(node => ({
                source: centerNode,
                target: node
            })),
            // Links from type nodes to entity nodes
            ...entityNodes.map(node => ({
                source: typeNodes.find(t => t.text === node.parentType),
                target: node
            }))
        ];

        // Draw curved links
        g.selectAll('path')
            .data(links)
            .enter()
            .append('path')
            .attr('d', d => {
                const dx = d.target.x - d.source.x;
                const dy = d.target.y - d.source.y;
                const dr = Math.sqrt(dx * dx + dy * dy) * 1.2;
                return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
            })
            .attr('fill', 'none')
            .attr('stroke', '#ccc')
            .attr('stroke-width', d => d.source.type === 'CENTER' ? 3 : 2)
            .attr('opacity', 0.6);

        // Draw all nodes
        const allNodes = [centerNode, ...typeNodes, ...entityNodes];
        const nodeGroups = g.selectAll('g.node')
            .data(allNodes)
            .enter()
            .append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Add node circles with gradients
        nodeGroups.each(function(d) {
            const node = d3.select(this);
            const gradientId = `gradient-${d.id}`;

            // Create gradient
            const gradient = svg.append('defs')
                .append('radialGradient')
                .attr('id', gradientId)
                .attr('cx', '30%')
                .attr('cy', '30%');

            let colors;
            if (d.type === 'CENTER') {
                colors = ['#6dd5ed', '#2193b0'];
            } else if (d.type === 'TYPE') {
                colors = ['#ffd3b6', '#ff9a9e'];
            } else {
                colors = ['#a8edea', '#fed6e3'];
            }

            gradient.append('stop')
                .attr('offset', '0%')
                .attr('stop-color', colors[0]);

            gradient.append('stop')
                .attr('offset', '100%')
                .attr('stop-color', colors[1]);

            // Add circle with gradient
            node.append('circle')
                .attr('r', d => {
                    if (d.type === 'CENTER') return 60;
                    if (d.type === 'TYPE') return 45;
                    return 35;
                })
                .attr('fill', `url(#${gradientId})`)
                .attr('stroke', '#fff')
                .attr('stroke-width', 3)
                .attr('filter', 'url(#drop-shadow)');
        });

        // Add drop shadow filter
        const defs = svg.append('defs');
        const filter = defs.append('filter')
            .attr('id', 'drop-shadow')
            .attr('height', '130%');

        filter.append('feGaussianBlur')
            .attr('in', 'SourceAlpha')
            .attr('stdDeviation', 3)
            .attr('result', 'blur');

        filter.append('feOffset')
            .attr('in', 'blur')
            .attr('dx', 2)
            .attr('dy', 2)
            .attr('result', 'offsetBlur');

        const feMerge = filter.append('feMerge');
        feMerge.append('feMergeNode')
            .attr('in', 'offsetBlur');
        feMerge.append('feMergeNode')
            .attr('in', 'SourceGraphic');

        // Add text labels
        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', d => d.type === 'CENTER' ? 0 : '.3em')
            .attr('fill', '#2c3e50')
            .attr('font-weight', d => d.type === 'CENTER' ? 'bold' : 'normal')
            .attr('font-size', d => {
                if (d.type === 'CENTER') return '16px';
                if (d.type === 'TYPE') return '14px';
                return '12px';
            })
            .each(function(d) {
                const text = d3.select(this);
                const words = d.text.split(/\s+|(?=\n)/);
                let line = [];
                let lineNumber = 0;
                const lineHeight = d.type === 'CENTER' ? 1.2 : 1.1;
                const y = d.type === 'CENTER' ? -20 : 0;
                const dy = d.type === 'CENTER' ? 16 : 12;

                for (let i = 0; i < words.length; i++) {
                    const word = words[i];
                    if (word === '\n') {
                        text.append('tspan')
                            .attr('x', 0)
                            .attr('y', y)
                            .attr('dy', `${lineNumber * lineHeight}em`)
                            .text(line.join(' '));
                        line = [];
                        lineNumber++;
                        continue;
                    }
                    line.push(word);
                    if (i === words.length - 1) {
                        text.append('tspan')
                            .attr('x', 0)
                            .attr('y', y)
                            .attr('dy', `${lineNumber * lineHeight}em`)
                            .text(line.join(' '));
                    }
                }
            });

        // Add hover interactions
        nodeGroups
            .on('mouseover', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('transform', `translate(${d.x},${d.y})scale(1.1)`);
            })
            .on('mouseout', function(event, d) {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr('transform', `translate(${d.x},${d.y})scale(1)`);
            });
    }

    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
});
