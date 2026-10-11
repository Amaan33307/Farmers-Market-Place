// =====================================================
// FARMER MARKETPLACE — AI FEATURES (browser side)
// 1. AI Price Insight on Add/Edit Product
// 2. "Write with AI" description button
// 3. AI Shopping Assistant on the Marketplace
// Each part only runs if its elements exist on the page.
// =====================================================

(function () {

    // Escape text before putting it into HTML
    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function rupees(value) {
        return "₹" + Number(value).toLocaleString("en-IN");
    }

    function field(form, name) {
        var el = form.querySelector('[name="' + name + '"]');
        return el ? el.value.trim() : "";
    }


    // =================================================
    // 1. AI PRICE INSIGHT
    // =================================================

    var priceBtn = document.getElementById("aiPriceBtn");

    if (priceBtn) {

        var form = priceBtn.closest("form");
        var box = document.getElementById("aiPriceResult");

        priceBtn.addEventListener("click", function () {

            var params = new URLSearchParams({
                name: field(form, "name"),
                category: field(form, "category"),
                unit: field(form, "unit"),
                location: field(form, "location"),
                price: field(form, "price"),
                exclude: priceBtn.dataset.exclude || ""
            });

            if (!field(form, "unit") || !field(form, "name")) {
                box.innerHTML = '<div class="alert alert-warning small mb-0">Enter the product name, category and unit first.</div>';
                return;
            }

            priceBtn.disabled = true;
            box.innerHTML = '<div class="small text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Analysing similar products…</div>';

            fetch("/ai/price-insight?" + params.toString(), { headers: { "Accept": "application/json" } })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (!data.available) {
                        box.innerHTML = '<div class="alert alert-secondary small mb-0">' + esc(data.message || "No insight available.") + '</div>';
                        return;
                    }

                    var colors = { fair: "success", below: "info", above: "warning" };

                    var verdict = data.verdict
                        ? '<div class="badge text-bg-' + colors[data.verdict.level] + ' mb-2">' + esc(data.verdict.text) + '</div>'
                        : "";

                    var rows = data.neighbours.map(function (n) {
                        return '<li>' + esc(n.name) + ' — ' + rupees(n.price) + ' <span class="text-muted">(' + esc(n.location) + ', ' + n.similarity + '% similar)</span></li>';
                    }).join("");

                    box.innerHTML =
                        '<div class="ai-box">' +
                            '<div class="fw-semibold mb-1"><i class="bi bi-stars me-1"></i>AI suggested price: ' +
                                rupees(data.predictedPrice) + ' / ' + esc(data.unit) + '</div>' +
                            '<div class="small text-muted mb-2">Fair range ' + rupees(data.range.min) + ' – ' + rupees(data.range.max) +
                                ' · confidence: ' + esc(data.confidence) + ' · based on ' + data.basedOn + ' similar product' + (data.basedOn === 1 ? "" : "s") + '</div>' +
                            verdict +
                            '<details class="small"><summary>Similar products used</summary><ul class="mb-0 mt-1">' + rows + '</ul></details>' +
                            '<button type="button" class="btn btn-sm btn-outline-success mt-2" id="aiUsePrice">Use ' + rupees(data.predictedPrice) + '</button>' +
                        '</div>';

                    document.getElementById("aiUsePrice").addEventListener("click", function () {
                        form.querySelector('[name="price"]').value = data.predictedPrice;
                    });

                })
                .catch(function () {
                    box.innerHTML = '<div class="alert alert-danger small mb-0">Could not load the price insight. Please try again.</div>';
                })
                .finally(function () {
                    priceBtn.disabled = false;
                });

        });

    }


    // =================================================
    // 2. WRITE DESCRIPTION WITH AI
    // =================================================

    var descBtn = document.getElementById("aiDescBtn");

    if (descBtn) {

        var descForm = descBtn.closest("form");
        var descStatus = document.getElementById("aiDescStatus");

        descBtn.addEventListener("click", function () {

            var textarea = descForm.querySelector('[name="description"]');

            var payload = {
                name: field(descForm, "name"),
                category: field(descForm, "category"),
                unit: field(descForm, "unit"),
                location: field(descForm, "location"),
                notes: textarea.value.trim()
            };

            if (!payload.name || !payload.category) {
                descStatus.textContent = "Enter the product name and category first.";
                descStatus.className = "small text-danger";
                return;
            }

            descBtn.disabled = true;
            descStatus.textContent = "Writing description…";
            descStatus.className = "small text-muted";

            fetch("/ai/description", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify(payload)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.description) {
                        textarea.value = data.description;
                        descStatus.textContent = "Done! Review and edit the text before saving.";
                        descStatus.className = "small text-success";
                    } else {
                        descStatus.textContent = data.error || "Could not write a description.";
                        descStatus.className = "small text-danger";
                    }
                })
                .catch(function () {
                    descStatus.textContent = "Could not reach the AI assistant.";
                    descStatus.className = "small text-danger";
                })
                .finally(function () {
                    descBtn.disabled = false;
                });

        });

    }


    // =================================================
    // 3. AI SHOPPING ASSISTANT
    // =================================================

    var assistantForm = document.getElementById("aiAssistantForm");

    if (assistantForm) {

        var output = document.getElementById("aiAssistantResult");

        assistantForm.addEventListener("submit", function (event) {

            event.preventDefault();

            var query = field(assistantForm, "query");
            var button = assistantForm.querySelector("button");

            if (query.length < 3) return;

            button.disabled = true;
            output.innerHTML = '<div class="small text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Finding the best matches…</div>';

            fetch("/ai/assistant", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({ query: query })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {

                    if (data.error) {
                        output.innerHTML = '<div class="alert alert-warning small mb-0">' + esc(data.error) + '</div>';
                        return;
                    }

                    var cards = (data.picks || []).map(function (p) {
                        return '<div class="col-md-6 col-lg-3"><a class="ai-pick" href="/products/' + encodeURIComponent(p.id) + '">' +
                            '<div class="fw-bold text-dark">' + esc(p.name) + '</div>' +
                            '<div class="text-success fw-semibold">' + rupees(p.price) + ' / ' + esc(p.unit) + '</div>' +
                            '<div class="small text-muted"><i class="bi bi-geo-alt"></i> ' + esc(p.location) + (p.farmerName ? ' · ' + esc(p.farmerName) : '') + '</div>' +
                            '<div class="small mt-1">' + esc(p.reason) + '</div>' +
                        '</a></div>';
                    }).join("");

                    output.innerHTML =
                        '<p class="small mb-3"><i class="bi bi-stars me-1 text-success"></i>' + esc(data.summary) + '</p>' +
                        (cards ? '<div class="row g-3">' + cards + '</div>' : "");

                })
                .catch(function () {
                    output.innerHTML = '<div class="alert alert-danger small mb-0">Could not reach the AI assistant.</div>';
                })
                .finally(function () {
                    button.disabled = false;
                });

        });

    }

})();
