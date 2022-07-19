/*
 * 二叉树结点。
 * 2051565
 * 创建于 2022年7月18日。
 */

/**
 * 二叉树结点。
 */
export class TreeNode {
    
    /** 左孩子。 */
    leftChild: TreeNode | null = null

    /** 右孩子。 */
    rightChild: TreeNode | null = null

    /** 上级节点。 */
    parent: TreeNode | null = null

    /** 线索化后的前驱。当 leftChild 为 null 时有效。 */
    prev: TreeNode | null = null

    /** 线索化后的后继。当 rightChild 为 null 时有效。 */
    next: TreeNode | null = null

    /** 附加数据。供调用者存储信息使用。 */
    data = new Map<String, any>()

    /**
     * 判断是否为叶子节点。
     */
    isLeaf = () => {
        return this.leftChild == null && this.rightChild == null
    }

    /**
     * 判断是否为根节点。
     */
    isRoot = () => {
        return this.parent == null
    }

    /**
     * 线索化。
     * @param method 线索化方案。
     */
    threading(method: 'pos' | 'mid' | 'pre') {

        // 通过搜索形成访问顺序队列，借助生成的队列进行线索化。

        let queue = new Array<TreeNode>()

        let dfs = (node: TreeNode | null) => {
            if (node != null) {
                node.prev = null
                node.next = null

                if (method == 'pre') {
                    queue.push(node)
                }

                dfs(node.leftChild)
                
                if (method == 'mid') {
                    queue.push(node)
                }
                
                dfs(node.rightChild)
                
                if (method == 'pos') {
                    queue.push(node)
                }
                
            }
        } // arrow function dfs

        dfs(this)

        for (let idx = 0; idx < queue.length; idx++) {
            let node = queue[idx]
            if (node.leftChild == null && idx > 0) {
                node.prev = queue[idx - 1]
            }

            if (node.rightChild == null && idx + 1 < queue.length) {
                node.next = queue[idx + 1]
            }
        }
    } // function threading
} // class TreeNode
