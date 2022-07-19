/*
 * 简易画板。包含二叉树的大量操作。
 * 2051565
 * 创建于 2022年7月18日。
 */

import { Button, message, Modal } from 'antd'
import React from 'react'
import { CSSProperties } from "react"
import { TreeNode } from '../data-structure/TreeNode'

export interface PainterCanvasProps {
    style?: CSSProperties
}

/**
 * 休眠。
 * 使用方法：await sleep(...)
 * 
 * @param milliseconds 休眠时间。
 */
function sleep(milliseconds: number) {
    return new Promise(resolve => setTimeout(resolve, milliseconds))
}

/**
 * 简易画板。内部可执行二叉树的绘制、遍历动画等。
 */
export class PainterCanvas extends React.Component<PainterCanvasProps> {

    /** 指向自己（React 节点对象）的引用。 */
    private selfRef: React.RefObject<HTMLCanvasElement>

    /** 指向内部画板对象的引用。 */
    private canvas!: HTMLCanvasElement

    /** 指向内部画布的应用。 */
    private ctx!: CanvasRenderingContext2D

    /** 画板背景颜色。 */
    private backgroundColor = '#d0dfe6'

    /** 节点主题色。 */
    private nodeBgColor = '#2f90b9'

    /** 叶节点背景颜色。 */
    private leafBgColor = '#1a6840'

    /**
     * 线索化的线的颜色列表。从中选取颜色作为节点外线索的颜色。
     */
    private threadColors = [
        '#dfc243', '#fb8b05', '#cf4813', '#20894d', '#2bae85', '#61649f', '#e16c96', '#7e1671',
        '#ee2746', '#12a182', '#248067', '#bacf65', '#f7de98', '#ee8055', '#863020', '#74759b' 
    ]

    /** 聚焦节点的颜色。 */
    private animationFocusBgColor = '#82111f'

    /** 动画中，在每个节点上暂停的时间。 */
    private animationSleepTimeMs = 500

    private mouseDown = false

    private prevPageX: number = -1
    private prevPageY: number = -1

    /** 线索化设置。 */
    private threaded: 'off' | 'pre' | 'mid' | 'pos' = 'off'

    /** 节点绘制半径。动态变化。 */
    private nodeRadius = 0

    /** 节点间连线宽度。 */
    private lineWidth = 4

    /** 树根。 */
    private treeRoot = new TreeNode

    /**
     * “平树矩阵”。
     * 每个元素都是一个节点数组，存有该层的所有节点。
     */
    flatTree!: Array<Array<TreeNode>>

    /** 操作锁。播放动画时上锁。 */
    locked: boolean = false

    /** 全局动画编号。用于控制停止异步播放的动画。 */
    private animationId: number = 0

    constructor(props: PainterCanvasProps) {
        super(props)

        this.selfRef = React.createRef()

        // 注册成员函数。

        this.clear = this.clear.bind(this)
        this.canvasTouchDownHandler = this.canvasTouchDownHandler.bind(this)
        this.redrawTree = this.redrawTree.bind(this)
        this.resizeUpdate = this.resizeUpdate.bind(this)
        this.threading = this.threading.bind(this)
        this.traverse = this.traverse.bind(this)
        this.unlock = this.unlock.bind(this)
        this.drawNode = this.drawNode.bind(this)
    }

    /**
     * 解锁。如果之前有上动画锁，则弹出通知。
     * 
     * @param reason 解锁原因。会在弹出通知时显示。
     */
    private unlock(reason: String | null = null) {
        if (this.locked) {
            this.animationId++
            this.locked = false
            let msg = '动画播放被打断。'
            if (reason != null) {
                msg += '原因：' + reason
            }
            message.error(msg)
        }
    }

    /**
     * 渲染。
     */
    override render() { // public

        let lambdaMoveHandler = (event: any) => { this.mouseFingerEventHandler(event) }
        
        return <canvas 
            ref={this.selfRef} 
            onMouseMove={lambdaMoveHandler} 
            onMouseDown={lambdaMoveHandler} 
            onMouseUp={lambdaMoveHandler} 
            style={this.props.style!} 
            onTouchStart={lambdaMoveHandler} 
            onTouchMove={lambdaMoveHandler} 
            onTouchEnd={lambdaMoveHandler} 
        />
    }

    /**
     * 预测量。
     * 
     * @return 叶节点个数。
     */
    private generateFlatTree(): number {
        let maxH = 0
        let currH = 0
        let leafCount = 0

        let flatTree = new Array<Array<TreeNode>>()
        
        flatTree.push(new Array<TreeNode>(this.treeRoot)) // 放入根节点。

        while (currH <= maxH) {
            for (let node of flatTree[currH]) {
                if (node.leftChild != null || node.rightChild != null) {
                    maxH = currH + 1

                    // 如果当前要插入的节点是该层要插入的第一个节点，则创建新的行。
                    if (flatTree.length <= maxH) { 
                        flatTree.push(new Array<TreeNode>())
                    }

                    if (node.leftChild != null) {
                        flatTree[maxH].push(node.leftChild)
                    }

                    if (node.rightChild != null) {
                        flatTree[maxH].push(node.rightChild)
                    }
                } else {
                    leafCount++ // 叶节点计数。
                }
            }

            currH++
        } 

        this.flatTree = flatTree
        return leafCount
    }


    /**
     * 绘制树。普通绘制，无动画。
     * 
     * @param threaded 线索化方式。'nul' 表示维持原有设置。
     * @return 叶节点个数。
     */
    redrawTree(
        highlightLeaf: boolean = false, 
        threaded: 'off' | 'mid' | 'pos' | 'pre' | 'nul' = 'nul'
    ): number {
        if (threaded != 'nul'){
            this.threaded = threaded
        }
        this.unlock('二叉树重绘。') // 解锁。
        this.clear() // 清空屏幕。

        // 更新“平树”，并获得叶节点个数。
        let leafCount = this.generateFlatTree()
        let nodeRows = this.flatTree // 取一个别名。

        // 计算绘制半径。

        let maxRowSize = 0

        for (let row of nodeRows) {
            maxRowSize = Math.max(maxRowSize, row.length)
        }
        
        this.nodeRadius = Math.min(
            this.canvas.width / maxRowSize,
            this.canvas.height / nodeRows.length
        ) * 0.6 / 2

        // 计算每个点的坐标。
        for (let row = 0; row < nodeRows.length; row++) {
            for (let col = 0; col < nodeRows[row].length; col++) {
                let node = nodeRows[row][col]

                node.data.set(
                    'canvasX',
                    this.canvas.width / nodeRows[row].length * (col + 0.5)
                )

                node.data.set(
                    'canvasY',
                    this.canvas.height / nodeRows.length * (row + 0.5)
                )
            }
        }

        // 绘图。
        for (let row = 0; row < nodeRows.length; row++) {
            for (let col = 0; col < nodeRows[row].length; col++) {
                let node = nodeRows[row][col]

                let children = []
                if (node.leftChild != null) {
                    children.push(node.leftChild)
                }

                if (node.rightChild != null) {
                    children.push(node.rightChild)
                }
                
                for (let child of children) {
                    this.ctx.beginPath()
                    this.ctx.moveTo(
                        node.data.get('canvasX'), node.data.get('canvasY')    
                    )

                    this.ctx.lineTo(child.data.get('canvasX'), child.data.get('canvasY'))
                    this.ctx.lineWidth = this.lineWidth
                    this.ctx.strokeStyle = this.nodeBgColor
                    this.ctx.stroke()
                    this.ctx.closePath()
                }

                if (highlightLeaf && node.isLeaf()) {
                    this.drawNode(node, this.leafBgColor)
                } else {
                    this.drawNode(node, this.nodeBgColor)
                }

            }
        }

        if (this.threaded != 'off') {
            this.threading(this.threaded) // 绘制线索。
        }

        return leafCount
    }

    /**
     * 绘制一个节点。
     * 
     * @param node 待绘制的节点对象。需要已经设置 canvasX 和 canvasY 数据。
     * @param color 颜色。
     */
    private drawNode(node: TreeNode, color: string) {
        this.ctx.beginPath()
        this.ctx.arc(
            node.data.get('canvasX'), node.data.get('canvasY'), 
            this.nodeRadius, 0, 2 * Math.PI
        )

        this.ctx.fillStyle = color

        this.ctx.fill()
        this.ctx.closePath()
    }

    /**
     * 线索化。
     * @param order 线索化方式。
     */
    private threading(order : 'pre' | 'mid' | 'pos') {
        this.treeRoot.threading(order) // 构建节点间线索关系。

        // 绘制线索。
        for (let row of this.flatTree) {
            for (let node of row) {

                // 随机取色。
                let threadColor = this.threadColors[
                    Math.floor(Math.random() * this.threadColors.length)
                ]

                // 前驱。
                if (node.prev != null) {
                    this.ctx.beginPath()
                    this.ctx.moveTo(
                        node.data.get('canvasX') - this.nodeRadius / 1.41421, 
                        node.data.get('canvasY') + this.nodeRadius / 1.41421
                    )

                    this.ctx.quadraticCurveTo(
                        node.data.get('canvasX') - 1.8 * this.nodeRadius, 
                        node.data.get('canvasY') + 1.8 * this.nodeRadius,
                        node.prev.data.get('canvasX'), 
                        node.prev.data.get('canvasY') + this.nodeRadius
                    )

                    this.ctx.lineWidth = this.lineWidth
                    this.ctx.strokeStyle = threadColor
                    this.ctx.stroke()
                    this.ctx.closePath()
                } else if (node.leftChild == null) {
                    this.ctx.beginPath()
                    this.ctx.moveTo(
                        node.data.get('canvasX') - this.nodeRadius / 1.41421, 
                        node.data.get('canvasY') + this.nodeRadius / 1.41421
                    )

                    this.ctx.lineTo(
                        node.data.get('canvasX') - 2 * this.nodeRadius / 1.41421, 
                        node.data.get('canvasY') + 2 * this.nodeRadius / 1.41421
                    )

                    this.ctx.lineWidth = this.lineWidth
                    this.ctx.strokeStyle = threadColor
                    this.ctx.stroke()
                    this.ctx.closePath()
                }

                // 后继。
                if (node.next != null) {
                    this.ctx.beginPath()
                    this.ctx.moveTo(
                        node.data.get('canvasX') + this.nodeRadius / 1.41421, 
                        node.data.get('canvasY') + this.nodeRadius / 1.41421
                    )

                    this.ctx.quadraticCurveTo(
                        node.data.get('canvasX') + 1.8 * this.nodeRadius, 
                        node.data.get('canvasY') + 1.8 * this.nodeRadius,
                        node.next.data.get('canvasX'), 
                        node.next.data.get('canvasY') + this.nodeRadius
                    )

                    this.ctx.lineWidth = this.lineWidth
                    this.ctx.strokeStyle = threadColor
                    this.ctx.stroke()
                    this.ctx.closePath()
                } else if (node.rightChild == null) {
                    this.ctx.beginPath()
                    this.ctx.moveTo(
                        node.data.get('canvasX') + this.nodeRadius / 1.41421, 
                        node.data.get('canvasY') + this.nodeRadius / 1.41421
                    )

                    this.ctx.lineTo(
                        node.data.get('canvasX') + 2 * this.nodeRadius / 1.41421, 
                        node.data.get('canvasY') + 2 * this.nodeRadius / 1.41421
                    )

                    this.ctx.lineWidth = this.lineWidth
                    this.ctx.strokeStyle = threadColor
                    this.ctx.stroke()
                    this.ctx.closePath()
                }
            } // for (let node of row)
        } // for (let row of this.flatTree) 
    } // private threading(order : 'pre' | 'mid' | 'pos')

    /**
     * 遍历。
     * 该函数会异步执行。
     * 
     * @param method 遍历方式。
     */
    async traverse(method: 'pre' | 'mid' | 'pos' | 'thread') {
        // 检查是否已经线索化。
        if (method == 'thread' && this.threaded == 'off') {
            message.error('先指定线索化方案，再遍历。')
            return
        }

        // 解除原来的动画锁。
        this.unlock('重新播放动画。')

        // 重绘二叉树。
        this.redrawTree()

        // 重新上锁。
        this.locked = true

        // 非线索化遍历。
        let normalTraverse = async (node: TreeNode, animationId: number) => {
            
            if (animationId != this.animationId) {
                return
            }

            if (method != 'pre' && node.leftChild != null) {
                await normalTraverse(node.leftChild, animationId)
            }

            if (method == 'pos' && node.rightChild != null) {
                await normalTraverse(node.rightChild, animationId)
            }

            // 当前节点。
            if (animationId == this.animationId) {
                this.drawNode(node, this.animationFocusBgColor)
                await sleep(this.animationSleepTimeMs)
                this.drawNode(node, this.nodeBgColor)
            }

            if (method == 'pre' && node.leftChild != null) {
                await normalTraverse(node.leftChild, animationId)
            }

            if (method != 'pos' && node.rightChild != null) {
                await normalTraverse(node.rightChild, animationId)
            }
        }

        let animationId = this.animationId
        if (method != 'thread') {
            await normalTraverse(this.treeRoot, animationId)
        } else if (this.threaded == 'pre') { // 前序线索遍历。
            let currNode: TreeNode | null = this.treeRoot
            while (currNode != null && animationId == this.animationId) {
                this.drawNode(currNode, this.animationFocusBgColor)
                await sleep(this.animationSleepTimeMs)
                this.drawNode(currNode, this.nodeBgColor)
                
                // 寻找下一个节点。
                if (currNode.leftChild != null) {
                    currNode = currNode.leftChild
                } else if (currNode.rightChild != null) {
                    currNode = currNode.rightChild
                } else {
                    currNode = currNode.next
                }
            }
        } else if (this.threaded == 'mid') { // 中序线索遍历。

            let currNode: TreeNode | null = this.treeRoot
            
            // 寻找第一个节点。
            while (currNode!.leftChild != null || currNode!.prev != null) {
                currNode = currNode!.leftChild != null ? currNode!.leftChild : currNode!.prev
            }

            while (currNode != null && animationId == this.animationId) {
                this.drawNode(currNode, this.animationFocusBgColor)
                await sleep(this.animationSleepTimeMs)
                this.drawNode(currNode, this.nodeBgColor)

                // 寻找下一个节点。
                if (currNode.rightChild != null) {
                    currNode = currNode.rightChild
                    while (currNode.leftChild != null) {
                        currNode = currNode.leftChild
                    }
                } else {
                    currNode = currNode.next
                }
            }
        } else if (this.threaded == 'pos') { // 后序线索遍历。
            // 寻找起点。
            let currNode: TreeNode | null = this.treeRoot
            while (currNode!.leftChild != null || currNode!.prev != null) {
                currNode = currNode!.leftChild != null ? currNode!.leftChild : currNode!.prev
            }

            while (currNode != null && animationId == this.animationId) {
                // 绘制当前节点。
                this.drawNode(currNode, this.animationFocusBgColor)
                await sleep(this.animationSleepTimeMs)
                this.drawNode(currNode, this.nodeBgColor)

                // 寻找下一个节点。
                if (currNode.next != null) {
                    currNode = currNode.next
                } else if (currNode.parent != null) {
                    if (currNode.parent.rightChild == currNode) {
                        currNode = currNode.parent
                        continue
                    }

                    currNode = currNode.parent
                    if (currNode.rightChild != null) {
                        currNode = currNode.rightChild

                        while (currNode!.leftChild != null || currNode!.rightChild != null) {
                            currNode = currNode!.leftChild != null ?
                                currNode!.leftChild : currNode!.rightChild
                        }
                    }
                } else {
                    currNode = null
                }

            }
        }

        if (animationId == this.animationId) {
            // 动画播放完毕。解锁。
            this.locked = false
        }
    } // async traverse(method: 'pre' | 'mid' | 'pos' | 'thread') 

    /**
     * 触控处理。
     */
    private mouseFingerEventHandler(event: any) {
        
        switch (event['type']) {
            case 'mouseup':
                this.mouseDown = false
                this.canvasTouchDownHandler(event['pageX'], event['pageY'])
                break
                
            case 'touchend':
                this.mouseDown = false
                this.canvasTouchDownHandler(
                    event['touches'][0]['pageX'], event['touches'][0]['pageY']
                )
                break
            
            case 'mousedown':
                this.mouseDown = true
                this.prevPageX = event['pageX']
                this.prevPageY = event['pageY']
                break

            case 'touchstart':
                this.mouseDown = true
                this.prevPageX = event['touches'][0]['pageX']
                this.prevPageY = event['touches'][0]['pageY']
                break

            default:
                break
        }
    }

    /**
     * 页面尺寸改变处理。
     */
    private resizeUpdate(e: any = null) {
        this.unlock('页面尺寸改变。')
        this.canvas.height = this.canvas.clientHeight
        this.canvas.width = this.canvas.clientWidth
        this.redrawTree()
    }

    override componentDidMount() { // public

        this.canvas = this.selfRef.current!
        this.ctx = this.canvas.getContext('2d')!

        this.resizeUpdate()
        window.addEventListener('resize', this.resizeUpdate)
    }

    override componentWillUnmount() {
        window.removeEventListener('resize', this.resizeUpdate)
    }

    /**
     * 清空画板。会着上默认颜色。
     */
    public clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        this.ctx.fillStyle = this.backgroundColor
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }

    private canvasTouchDownHandler(pageX: number, pageY: number) {
        if (this.prevPageX < 0) {
            this.prevPageX = pageX
            this.prevPageY = pageY
            return
        }

        let clientW = this.canvas.clientWidth
        let clientH = this.canvas.clientHeight
        let canvasW = this.canvas.width
        let canvasH = this.canvas.height
        let leftOff = this.canvas.offsetLeft
        let topOff = this.canvas.offsetTop

        let zoomX = canvasW / clientW
        let zoomY = canvasH / clientH

        let canvasPosPrev = {
            x: (this.prevPageX - leftOff) * zoomX,
            y: (this.prevPageY - topOff) * zoomY
        }

        let canvasPosNext = {
            x: (pageX - leftOff) * zoomX,
            y: (pageY - topOff) * zoomY
        }

        if (Math.pow(this.prevPageX - pageX, 2) + Math.pow(this.prevPageY - pageY, 2) > 121) {
            return
        }

        let canvasX = canvasPosNext.x
        let canvasY = canvasPosNext.y

        let nodeOnTouch: TreeNode | null = null
        nodeIteration: for (let row of this.flatTree) {
            for (let node of row) {
                if (
                    Math.pow(canvasX - node.data.get('canvasX'), 2)
                    + Math.pow(canvasY - node.data.get('canvasY'), 2)
                    <= Math.pow(this.nodeRadius, 2)
                ) {
                    nodeOnTouch = node
                    break nodeIteration
                }
            }
        }

        if (nodeOnTouch != null) {
            this.unlock('节点操作。')

            Modal.info({
                title: '希望对这个节点做什么...',
                centered: true,
                okButtonProps: {
                    type: 'ghost'
                },
                
                okText: '关闭',
                maskClosable: true,

                content: <div style={{display: 'flex', flexDirection: 'row', marginTop: '24px'}}>
                    <Button 
                        onClick={
                            () => this.nodeModifyOperation(nodeOnTouch!, 'addL')
                        }
                    >添加左孩子</Button>
                    <Button 
                        style={{marginLeft: '12px'}}
                        onClick={
                            () => this.nodeModifyOperation(nodeOnTouch!, 'addR')
                        }
                    >添加右孩子</Button>
                    <Button 
                        style={{marginLeft: '12px'}} danger
                        onClick={
                            () => {
                                if (this.nodeModifyOperation(nodeOnTouch!, 'tryRm')) {
                                    Modal.destroyAll()
                                }
                            }
                        }
                    >删除节点</Button>
                </div>,
            })
        } else {
            message.warn('点击节点以继续。')
        }
    }

    /**
     * 点编辑操作。
     * 
     * @param node 操作目标。
     * @param op 操作。
     * @returns 操作是否生效。
     */
    private nodeModifyOperation(node: TreeNode, op: 'addL' | 'addR' | 'tryRm' | 'rm'): boolean {
        let self = this
        switch (op) {
            case 'addL': // 添加左孩子。
                if (node.leftChild != null) {
                    message.error('该节点已有左孩子。')
                    return false
                } else {
                    node.leftChild = new TreeNode
                    node.leftChild.parent = node

                    this.redrawTree()
                    message.success('添加成功。')
                    return true
                }
                
            
            case 'addR': // 添加右孩子。
                if (node.rightChild != null) {
                    message.error('该节点已有右孩子。')
                    return false
                } else {
                    node.rightChild = new TreeNode
                    node.rightChild.parent = node

                    this.redrawTree()
                    message.success('添加成功。')
                    return true
                }

            case 'rm': // 删除。
            case 'tryRm': // 尝试删除。
                if (node == this.treeRoot) {
                    message.error('根节点禁止删除。')
                    return false
                } else if (op == 'rm' || (node.leftChild == null && node.rightChild == null)) {
                    if (node.parent!.leftChild == node) {
                        node.parent!.leftChild = null
                    } else {
                        node.parent!.rightChild = null
                    }

                    this.redrawTree()
                    message.success('删除成功。')
                    return true
                } else {
                    Modal.warn({
                        title: '此操作会将该节点的所有孩子一同删除。',
                        content: '右上角按钮可取消操作。',
                        okText: '删除',
                        closable: true,
                        okType: 'danger',
                        maskClosable: true,
                        centered: true,
                        onOk() {
                            self.nodeModifyOperation(node, 'rm')
                            Modal.destroyAll()
                        }
                    })
                    return false
                }
        } // switch (op)
    } // function nodeModifyOperation

}
