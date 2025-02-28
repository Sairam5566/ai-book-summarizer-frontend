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

            if (!response.ok) throw new Error('Upload failed');

            const { id } = await response.json();
            await processBook(id);

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = 'Error processing file. Please try again.';
            progressBar.style.backgroundColor = 'var(--error-color)';
        }
    }

    async function processBook(bookId) {
        try {
            statusText.textContent = 'Processing book...';
            progressBar.style.width = '50%';

            // Poll for results
            const result = await pollForResults(bookId);
            
            // Display results
            displayResults(result);
            
            processingSection.style.display = 'none';
            resultsSection.style.display = 'block';

        } catch (error) {
            console.error('Error:', error);
            statusText.textContent = 'Error processing book. Please try again.';
            progressBar.style.backgroundColor = 'var(--error-color)';
        }
    }

    async function pollForResults(bookId) {
        const maxAttempts = 60; // 5 minutes with 5-second intervals
        let attempts = 0;

        while (attempts < maxAttempts) {
            const response = await fetch(`${API_URL}/status/${bookId}`);
            const data = await response.json();

            if (data.status === 'completed') {
                progressBar.style.width = '100%';
                return data.result;
            } else if (data.status === 'failed') {
                throw new Error('Processing failed');
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        throw new Error('Processing timed out');
    }

    function displayResults(result) {
        // Display summary
        document.getElementById('summaryContent').innerHTML = `
            <h4>Final Summary</h4>
            <p>${result.final_summary}</p>
            <h4>Chapter Summaries</h4>
            ${result.chunk_summaries.map((summary, i) => `
                <div class="chapter-summary">
                    <h5>Chapter ${i + 1}</h5>
                    <p>${summary}</p>
                </div>
            `).join('')}
        `;

        // Display key phrases
        document.getElementById('keyPhrasesContent').innerHTML = result.key_phrases
            .map(phrase => `<span class="key-phrase">${phrase}</span>`)
            .join('');

        // Create mindmap visualization using D3.js
        createMindmap(result);
    }

    function createMindmap(data) {
        const width = 800;
        const height = 600;

        const svg = d3.select('#mindmapVisualization')
            .append('svg')
            .attr('width', width)
            .attr('height', height);

        const root = d3.hierarchy({
            name: "Book Summary",
            children: [
                {
                    name: "Key Phrases",
                    children: data.key_phrases.map(phrase => ({ name: phrase }))
                },
                {
                    name: "Chapters",
                    children: data.chunk_summaries.map((summary, i) => ({
                        name: `Chapter ${i + 1}`,
                        summary: summary
                    }))
                }
            ]
        });

        const treeLayout = d3.tree().size([height, width - 160]);
        treeLayout(root);

        // Add links
        svg.selectAll('path')
            .data(root.links())
            .enter()
            .append('path')
            .attr('d', d3.linkHorizontal()
                .x(d => d.y)
                .y(d => d.x))
            .attr('fill', 'none')
            .attr('stroke', '#ccc');

        // Add nodes
        const nodes = svg.selectAll('g')
            .data(root.descendants())
            .enter()
            .append('g')
            .attr('transform', d => `translate(${d.y},${d.x})`);

        nodes.append('circle')
            .attr('r', 5)
            .attr('fill', 'var(--primary-color)');

        nodes.append('text')
            .attr('dx', d => d.children ? -8 : 8)
            .attr('dy', 3)
            .attr('text-anchor', d => d.children ? 'end' : 'start')
            .text(d => d.data.name)
            .style('font-size', '12px');
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
