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

            // Upload file
            const response = await fetch(`${API_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            progressBar.style.width = '50%';
            statusText.textContent = 'Processing text...';

            const result = await response.json();

            if (result.error) {
                throw new Error(result.error);
            }

            // Display results
            progressBar.style.width = '100%';
            statusText.textContent = 'Complete!';
            displayResults(result);

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = `Error: ${error.message}`;
            progressBar.style.width = '0%';
        }
    }

    function displayResults(result) {
        processingSection.style.display = 'none';
        resultsSection.style.display = 'block';

        // Display summary
        document.getElementById('summaryText').textContent = result.summary;

        // Create mindmap visualization
        createMindmap(result.entities);
    }

    function createMindmap(entities) {
        const width = 800;
        const height = 600;
        const centerX = width / 2;
        const centerY = height / 2;

        // Clear previous visualization
        d3.select('#mindmap').selectAll('*').remove();

        // Create SVG
        const svg = d3.select('#mindmap')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        // Create nodes
        const nodes = entities.map((entity, index) => ({
            id: index,
            text: entity.text,
            type: entity.type,
            x: centerX + Math.cos(index * 2 * Math.PI / entities.length) * 200,
            y: centerY + Math.sin(index * 2 * Math.PI / entities.length) * 200
        }));

        // Create center node
        const centerNode = {
            id: 'center',
            text: 'Summary',
            type: 'CENTER',
            x: centerX,
            y: centerY
        };

        // Add links
        const links = nodes.map(node => ({
            source: centerNode,
            target: node
        }));

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
            .attr('stroke-width', 1);

        // Draw nodes
        const nodeGroups = svg.selectAll('g')
            .data([centerNode, ...nodes])
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.x},${d.y})`);

        nodeGroups.append('circle')
            .attr('r', d => d.type === 'CENTER' ? 40 : 30)
            .attr('fill', d => d.type === 'CENTER' ? '#4CAF50' : '#2196F3')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2);

        nodeGroups.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '.3em')
            .attr('fill', 'white')
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
