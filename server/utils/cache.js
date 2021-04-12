/* jshint esversion: 8 */
exports.Cache = class Cache {
    // TTL in seconds
    constructor(items, ttl = -1) {
        this.items = [];
        items.forEach((item) => {
            this.add(item);
        });
        this.ttl = ttl;
    }

    size() {
        return this.items.length;
    }

    add(item) {
        this.items.push({ item: item, date: new Date() });
    }

    getItems() {
        return this.items.map((item) => {
            return item.item;
        });
    }

    getByIndex(index) {
        var seconds = (new Date().getTime() - this.items[index].date.getTime()) / 1000;
        if (this.ttl != -1 && seconds > this.ttl) {
            this.delete(index);
            return null;
        }
        return this.items[index].item;
    }

    getByKey(key, value) {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].item[key] == value) {
                var seconds = (new Date().getTime() - this.items[i].date.getTime()) / 1000;
                if (this.ttl != -1 && seconds > this.ttl) {
                    this.delete(i);
                    return null;
                }

                return this.items[i].item;
            }
        }

        return null;
    }

    findByKey(key, value) {
        for (var i = 0; i < this.items.length; i++) {
            if (this.items[i].item[key] == value) {
                var seconds = (new Date().getTime() - this.items[i].date.getTime()) / 1000;
                if (this.ttl != -1 && seconds > this.ttl) {
                    this.delete(i);
                    return -1;
                }
                return i;
            }
        }

        return -1;
    }

    delete(index) {
        if (index < 0 || index >= this.items.length) {
            return false;
        }
        this.items.splice(index, 1);
        return true;
    }

    update(index, item) {
        this.items[index].item = item;
        this.items[index].date = new Date();
    }
};
