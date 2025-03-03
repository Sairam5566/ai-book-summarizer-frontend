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
        const width = 800;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;

        // Clear previous visualization
        const mindmapVisualization = document.getElementById('mindmapVisualization');
        if (!mindmapVisualization) return;
        mindmapVisualization.innerHTML = '';

        // Create SVG
        const svg = d3.select('#mindmapVisualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height)
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('style', 'max-width: 100%; height: auto;');

        // Group entities by type
        const groupedEntities = {};
        entities.forEach(entity => {
            if (!groupedEntities[entity.type]) {
                groupedEntities[entity.type] = [];
            }
            groupedEntities[entity.type].push(entity);
        });

        // Create nodes for each type
        const typeNodes = Object.keys(groupedEntities).map((type, index) => ({
            id: `type-${index}`,
            text: type,
            type: 'TYPE',
            x: centerX + Math.cos(index * 2 * Math.PI / Object.keys(groupedEntities).length) * 150,
            y: centerY + Math.sin(index * 2 * Math.PI / Object.keys(groupedEntities).length) * 150
        }));

        // Create nodes for each entity
        const entityNodes = [];
        typeNodes.forEach((typeNode, typeIndex) => {
            const typeEntities = groupedEntities[typeNode.text];
            typeEntities.forEach((entity, entityIndex) => {
                const angle = (entityIndex * 2 * Math.PI / typeEntities.length) + (typeIndex * 2 * Math.PI / typeNodes.length);
                entityNodes.push({
                    id: `entity-${entityIndex}-${typeIndex}`,
                    text: entity.text,
                    type: 'ENTITY',
                    parentType: typeNode.text,
                    x: typeNode.x + Math.cos(angle) * 100,
                    y: typeNode.y + Math.sin(angle) * 100
                });
            });
        });

        // Create center node
        const centerNode = {
            id: 'center',
            text: 'Book Summary',
            type: 'CENTER',
            x: centerX,
            y: centerY
        };

        // Create all links
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

        // Draw links
        svg.selectAll('line')
            .data(links)
            .enter()
            .append('line')
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)
            .attr('stroke', '#999')
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', d => d.source.type === 'CENTER' ? 2 : 1);

        // Draw all nodes
        const allNodes = [centerNode, ...typeNodes, ...entityNodes];
        const nodeGroups = svg.selectAll('g')
            .data(allNodes)
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        // Add circles for nodes
        nodeGroups.append('circle')
            .attr('r', d => {
                if (d.type === 'CENTER') return 40;
                if (d.type === 'TYPE') return 30;
                return 20;
            })
            .attr('fill', d => {
                if (d.type === 'CENTER') return '#4CAF50';
                if (d.type === 'TYPE') return '#2196F3';
                return '#FF9800';
            })
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        // Add text labels
        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('fill', 'white')
            .attr('font-size', d => {
                if (d.type === 'CENTER') return '14px';
                if (d.type === 'TYPE') return '12px';
                return '10px';
            })
            .text(d => d.text.length > 15 ? d.text.substring(0, 15) + '...' : d.text);
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
