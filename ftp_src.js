const ftp = require('.');

module.exports = function (RED) {
    function FtpSrcNode(config) {
        RED.nodes.createNode(this, config);
        this.path = config.path;

        let node = this;
        // console.log("config", config)

        node.on('input', function (msg, send) {
            let configObj = { buffer: false, ...msg.config } // default to streaming mode
            if (!msg?.config?.ftp) {
                node.error("config.ftp object required (e.g. {buffer:false, ftp:{host:'mywebsite.tld',...}})");
                return;
            }

            /** 
             * plugins will be an array of objects where obj.init is a function that returns a stream. This clones well for
             * when msg is cloned by Node-RED (for passing down multiple wires), unlike arrays of streams or other such options
             */
            msg.plugins = [];

            // set the payload to give info on the gulp stream we're creating
            msg.payload = "ftp.src: " + node.path;
            msg.topic = "gulp-initialize";

            msg.plugins.push({
                name: config.type,
                init: () => {
                    // set up new FTP connection
                    let conn;
                    try {
                        conn = new ftp.create(msg.config.ftp);
                    }
                    catch (err) {
                        node.error(err);
                        return;
                    }

                    return conn.src(node.path, configObj)
                        .on("data", () => {
                            this.status({ fill: "green", shape: "dot", text: "active" });
                        })
                        .on("end", () => {
                            this.status({ fill: "green", shape: "ring", text: "ready" });
                        })
                }
            })

            send(msg);
        });

    }
    RED.nodes.registerType("ftp.src", FtpSrcNode);
}