const express = require("express");

const metrics = require("./metrics");

const app = express();

const PORT = 8080;

// --------------------------------------------------
// Metrics Middleware
// --------------------------------------------------

app.use((req, res, next) => {

    const end = metrics.httpRequestDuration.startTimer();

    res.on("finish", () => {

        end({

            method: req.method,

            route: req.route ? req.route.path : req.path,

            status_code: res.statusCode

        });

        console.log(`${req.method} ${req.path} ${res.statusCode}`);

    });

    next();

});

// --------------------------------------------------
// Inventory API
// --------------------------------------------------

app.get("/", async (req, res) => {

    try {

        console.log("Incoming request from", req.ip);

        console.log("Calling Orders API...");

        const response = await fetch("http://orders-api:8081/orders");

        const orders = await response.json();

        console.log(`Orders API returned ${orders.length} orders`);

        res.json({

            service: "inventory-api",

            orders

        });

        console.log("Response sent successfully");

    } catch (err) {

        console.error(err);

        res.status(500).json({

            error: "Unable to reach Orders API"

        });

    }

});

// --------------------------------------------------
// Health
// --------------------------------------------------

app.get("/health", (req, res) => {

    res.send("OK");

});

// --------------------------------------------------
// Prometheus Metrics
// --------------------------------------------------

app.get("/metrics", async (req, res) => {

    res.set("Content-Type", metrics.register.contentType);

    res.end(await metrics.register.metrics());

});

// --------------------------------------------------
// Start Server
// --------------------------------------------------

app.listen(PORT, () => {

    console.log(`Inventory API listening on ${PORT}`);

});
