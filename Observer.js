class Wathcer {
    constructor(vm, data, cb) {
        this.vm = vm
        this.data = data
        this.cb = cb
            //取旧值
        this.oldVal = this.getOldVal(this.data, this.vm)
    }
    getOldVal(data, vm) {

        Dep.traget = this
            //去获取data的值的时候会调用get函数，在get函数里面就把Watch传进去了
        const OldVal = compliUtil.getVal(data, vm) //获取就值，在Watcher创建时就获取了

        Dep.traget = null
        return OldVal
    }
    update() {
        const newVal = compliUtil.getVal(this.data, this.vm) //当修改时会调用update，此时获取到新值
        if (newVal !== this.oldVal) {
            this.oldVal = newVal
            this.cb(newVal) //值修改了，调用回调函数
        }
    }
}
class Dep {
    constructor() {
            this.subs = []
        }
        //添加观察者
    addSub(watcher) {
            this.subs.push(watcher)
        }
        //通知观察者去修改
    notify() {

        this.subs.forEach(w => w.update())
    }
}
class Observer {
    constructor(data) {
        this.observer(data)
    }
    observer(data) {

        //争对对象
        if (data && typeof data === 'object') {
            //劫持第一层
            Object.keys(data).forEach(item => {

                //劫持下面几层
                this.defineReactive(data, item, data[item])
            })
        }
    }
    defineReactive(obj, keys, value) {
        this.observer(value) //递归调用

        const dep = new Dep()
            //监听每一个值
        Object.defineProperty(obj, keys, {
            enumerable: true,
            configurable: false,

            get() {
                //订阅数据时，往Dep中添加观察者

                Dep.traget && dep.addSub(Dep.traget)
                return value
            },
            set: (newVla) => { //当值改变后才会调用此函数。 
                this.observer(newVla) //如果值是对象时，改变时也要进行监听
                if (newVla !== value) {
                    value = newVla
                }
                dep.notify()
            }
        })
    }
}