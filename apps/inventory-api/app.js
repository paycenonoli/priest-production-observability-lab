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
    try {
        const response = await fetch("http://orders-api:8081/orders");

        const orders = await response.json();

        res.json({
            service: "inventory-api",
            orders: orders
        });
    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: "Unable to reach Orders API"
        });
    }
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
