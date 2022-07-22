/*
 * 群组节点。
 * 2051565 
 * 创建于 2022年7月20日。
 */

import { FreeKeyObject } from "./FreeKeyObject"
import { NodeBase, NodeTag } from "./NodeBase"

/**
 * 群组节点。
 */
export class GroupNode extends NodeBase {
    relationCoefficient: number = 1.0
    constructor(
        name: string, tag: NodeTag, coefficient: number = 1.0, id: number = -1
    ) {
        super(name, tag, id)
        this.relationCoefficient = coefficient
    }

    /**
     * 转换为便于序列化的对象。
     */
    override toJsonableObject(): FreeKeyObject {
        let res = super.toJsonableObject()
        res.coef = this.relationCoefficient
        return res
    }
}
