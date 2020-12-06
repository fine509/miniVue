const compliUtil = {
    getVal(data, vm) {

        return data.split('.').reduce((data, current) => {

            //return的这个data[current]将作为下次的data，
            //即当进入下一轮后，data[current]===vm.$data[data][data1]===vm.$data.msg.a,由于没有下一个了
            //所以会将vm.$data.msa.a返回
            return data[current]
        }, vm.$data)
    },
    setVal(data, vm, newVal) {
        const arr = data.split('.')
        let i = arr.length
        let j = 0
        return arr.reduce((data, current) => {

            j++
            if (j === i) { data[current] = newVal } else return data[current]

        }, vm.$data)


    },
    getContenVal(data, vm) {
        value = data.replace(/\{\{(.+?)\}\}/g, (...arg) => {

            return this.getVal(arg[1], vm)
        })
        return value
    },
    test(node, data, vm) { //data相当于msg,input这些，通过传进来的vm(Mvue类),vm.$data[data]取到这些值
        //文本节点处理 有一些是{{a}}---{{b}}这些，要做处理
        let value
        if (data.includes('{{')) {
            value = data.replace(/\{\{(.+?)\}\}/g, (...arg) => {
                new Wathcer(vm, arg[1], (newVal) => {
                    this.update.testUpdater(node, this.getContenVal(data, vm))
                })
                return this.getVal(arg[1], vm)
            })
        } else {
            value = this.getVal(data, vm)
            new Wathcer(vm, data, (newVal) => {
                this.update.testUpdater(node, newVal)
            })
        }

        this.update.testUpdater(node, value)
    },
    html(node, data, vm) {
        const value = this.getVal(data, vm)
            //第一次编译完成后就创建一个watcher
        new Wathcer(vm, data, (newVal) => {
            this.update.htmlUpdater(node, newVal)
        })
        this.update.htmlUpdater(node, value)
    },
    model(node, data, vm) {
        const value = this.getVal(data, vm)
            //数据更新视图
        new Wathcer(vm, data, (newVal) => {
                this.update.modelUpdater(node, newVal)
            })
            //视图更新数据
        node.addEventListener('input', (e) => {
            this.setVal(data, vm, e.target.value)
        })
        this.update.modelUpdater(node, value)
    },
    on(node, data, vm, eventName) {
        let fn = vm.$config.methods && vm.$config.methods[data]
            //如果直接写fn()，他的this指向的是window，所以要改变this指向

        node.addEventListener(eventName, fn.bind(vm))
    },
    bind(node, data, vm, attrName) {
        const value = this.getVal(data, vm)

        node[attrName] = value
    },
    update: {
        htmlUpdater(node, value) {
            node.innerHTML = value
        },
        testUpdater(node, value) {
            node.textContent = value
        },
        modelUpdater(node, value) {
            node.value = value
        }


    }
}
class Complie { //实现一个complie解析器
    constructor(el, vm) {
        //判断节点，不是的话就将获取#app的模板
        this.el = this.isElementNode(el) ? el : document.querySelector(el)
        this.vm = vm
            //遍历节点进行数据更新会进行大量DOM操作，引起回流，故采用文档碎片。
        const fragment = this.nodeFragment(this.el)
            //编译模板 
        this.complie(fragment)

        //将模板追加到app
        this.el.appendChild(fragment)

    }

    //定义一个判断是否元素节点的方法
    isElementNode(node) {
            return node.nodeType === 1
        }
        //定义一个文档碎片方法  
    nodeFragment(el) {
            //将模板节点放入文档碎片钟
            const f = document.createDocumentFragment()

            //for循环遍历模板节点
            let firstChild
            while (firstChild = el.firstChild) {

                f.appendChild(firstChild)
            }
            return f
        }
        //定义一个编译模板的方法
    complie(fragment) {

        const children = fragment.childNodes
        Array.from(children).forEach(item => {
            if (this.isElementNode(item)) {
                //判断是否元素节点 编译元素节点

                this.complieElement(item)

            } else {
                //文本节点
                this.complieText(item)
            }
            //判断是否里面有嵌套节点，有则遍历出来
            if (item.childNodes && item.childNodes.length) {
                this.complie(item)
            }
        })
    }
    complieElement(element) {
        const attributes = element.attributes;

        [...attributes].forEach(item => {

            let { name, value } = item

            if (this.isV(name, 'v-')) {
                const [, dirctive] = name.split('-') //html text model on:click
                const [dirname, event] = dirctive.split(':') //html text model on 
                    //更新数据
                compliUtil[dirname](element, value, this.vm, event) //调用compliUtil类
                element.removeAttribute(`v-${dirctive}`)
            }
            //处理语法糖
            else if (this.isV(name, '@')) {
                let [, event] = name.split('@')
                compliUtil['on'](element, value, this.vm, event)
            } else if (this.isV(name, ':')) {
                let [, attr] = name.split(':')
                compliUtil['bind'](element, value, this.vm, attr)
            }
        })
    }
    isV(item, starts) {
        return item.startsWith(starts)
    }
    complieText(node) {
        const content = node.textContent;

        if (/\{\{(.+?)\}\}/.test(content)) {


            compliUtil['test'](node, content, this.vm) //调用compliUtil类
        }
    }
}

class Mvue {
    constructor(config) {
        this.$el = config.el
        this.$data = config.data
        this.$config = config
            //解析模板
        if (this.$el) {
            //实现一个数据观察者
            new Observer(this.$data)
                //实现一个指令编译器
            new Complie(this.$el, this)
            this.proxyData(this.$data) //代理
        }
    }
    proxyData(data) {
        console.log(this);
        for (const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newVal) {
                    data[key] = newVal
                }

            })
        }
    }
}