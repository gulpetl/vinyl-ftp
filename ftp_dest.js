const ftp = require('.');
const combine = require('stream-combiner');

module.exports = function (RED) {
    function FtpDestNode(config) {
        RED.nodes.createNode(this, config);
        this.path = config.path;
        var node = this;
        node.on('input', function (msg, send) {
            if (!msg.topic?.startsWith("gulp")) {
                this.status({ fill: "red", shape: "dot", text: "missing .src node" });
            }
            else if (msg.topic == "gulp-info") {
                // ignore this informational message--but pass it along below
            }
            else if (msg.topic == "gulp-initialize") {
                if (!msg.plugins) {
                    node.warn(`ftp.dest: cannot initialize; missing gulp.src?`)
                    return;
                }

                // set up new FTP connection
                if (!msg?.config?.ftp) {
                    node.error("config.ftp object required (e.g. {buffer:false, ftp:{host:'mywebsite.tld',...}})");
                    return;
                }
                let conn;
                try {
                    conn = new ftp.create(msg.config.ftp);
                }
                catch (err) {
                    node.error(err);
                    return;
                }

                console.log(`ftp.dest: creating gulp stream; combining ${msg.plugins.length} plugin streams`)
                combine(msg.plugins.map((plugin) => plugin.init()))
                    .pipe(conn.dest(node.path)
                        .on("data", (file) => {
                            this.status({ fill: "green", shape: "dot", text: "active" });

                            // send an info message to announce the file we're processing
                            let fileDescription = `${file.history[0].split(/[\\/]/).pop()} -> ${file?.inspect()}`
                            msg.payload = `gulpfile: ${fileDescription}`;
                            msg.topic = "gulp-info";
                            msg.gulpfile = file;
                            // console.log("gulp.dest:", fileDescription)

                            send(msg);
                        })
                        .on("end", () => {
                            this.status({ fill: "green", shape: "ring", text: "ready" });
                        })

                    );

                this.status({ fill: "green", shape: "ring", text: "ready" });
            }

            send(msg);
        });
    }
    RED.nodes.registerType("ftp.dest", FtpDestNode);
}