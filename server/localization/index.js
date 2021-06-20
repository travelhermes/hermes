/* jshint esversion: 8 */

const { fs, Volume } = require('memfs');
const realFs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const mime = require('mime-types');

const WEB_ROOT = path.join(__dirname, '/../web');
const LANG_ROOT = path.join(__dirname, 'lang');

/* Localization files */
const langs = {};
var langFiles = realFs.readdirSync(LANG_ROOT);
for (let i = 0; i < langFiles.length; i++) {
	const lang = langFiles[i].replace(LANG_ROOT, '').replace('.json', '');
	langs[lang] = JSON.parse(realFs.readFileSync(path.join(LANG_ROOT, langFiles[i])));
}

function walk(directoryName) {
	var paths = [];
	var files = realFs.readdirSync(directoryName);
	for (let i = 0; i < files.length; i++) {
		const file = files[i];

		var fullPath = path.join(directoryName, file);
		var f = realFs.statSync(fullPath);

		if (f.isDirectory()) {
			var res = walk(fullPath);
			for (let j = 0; j < res.length; j++) {
				paths.push(res[j]);
			}
		} else {
			paths.push(fullPath);
		}
	}

	return paths;
}

function readFileMemfs(volume, path) {
	return new Promise((resolve, reject) => {
		volume.readFile(path, 'utf-8', (err, data) => {
			if (err) {
				reject(err);
				return;
			}

			resolve(data);
		});
	});
}

class Localization {
	constructor() {
		/* Copy all HTML, CSS and JS files to memfs */
		this.paths = [];

		const res = walk(WEB_ROOT);
		var json = {};

		for (let i = 0; i < res.length; i++) {
			if (res[i].endsWith('.html') || res[i].endsWith('.css') || res[i].endsWith('.js')) {
				var memfsPath = res[i].replace(WEB_ROOT, '');
				json[memfsPath] = realFs.readFileSync(res[i], 'utf-8');
				this.paths.push(memfsPath);
				if (res[i].endsWith('index.html')) {
					this.paths.push(memfsPath.replace('index.html', ''));
				}
			}
		}

		this.volume = Volume.fromJSON(json, '/');
	}

	getFile(request, reply) {
		// Remove ../
		const urlData = request.urlData();
		var url = urlData.path.replace(/\.\.\//g, '').replace(/\.\./g, '');

		// Get mime type
		var mimeType = mime.contentType(path.extname(url));

		/* If in memfs, return from here */
		if (this.paths.includes(url)) {
			// Trailing slash means index.html
			if (url.endsWith('/')) {
				url = path.join(url, 'index.html');
				mimeType = 'text/html; charset=utf-8';
			}

			// Read file from memfs, translate and send
			readFileMemfs(this.volume, url)
				.then((data) => {
					if (url.endsWith('.html')) {
						data = Handlebars.compile(data)(langs[request.detectedLng]);
					}
					reply.status(200).type(mimeType).send(data);
				})
				.catch((err) => {
					reply.status(500).send(err);
				});
		} else {
			// Otherwise, return from real fs
			realFs.readFile(path.join(WEB_ROOT, url), (err, data) => {
				if (err) {
					reply.status(404).type('text/plain; charset=utf-8').send('Not found');
					return;
				}
				reply.status(200).type(mimeType).send(data);
			});
		}
	}

	static getString(id, lang) {
		return langs[lang][id];
	}
}

module.exports = Localization;
