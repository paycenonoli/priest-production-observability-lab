const metrics = require("./metrics");

const express = require("express");

const app = express();

const PORT = 8080;

// Metrics middleware
app.use((req, res, next) => {

    const end = metrics.httpRequestDuration.startTimer();

    res.on("finish", () => {
        end({
            method: req.method,
            route: req.route ? req.route.path : req.path,
            status_code: res.statusCode
        });
    });

    next();
});

app.get("/", async (req, res) => {

    // Simulate a slow downstream dependency
    await new Promise(resolve => setTimeout(resolve, 3000));

    res.json({
        service: "inventory-api",
        status: "running"
    });

});

app.get("/health", (req, res) => {
    res.send("OK");
});

app.get("/metrics", async (req, res) => {
    res.set("Content-Type", metrics.register.contentType);
    res.end(await metrics.register.metrics());
});

app.listen(PORT, () => {
    console.log(`Inventory API listening on ${PORT}`);
});
