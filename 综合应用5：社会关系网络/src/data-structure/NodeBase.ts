/*
 * 节点基类。
 * 2051565 
 * 创建于 2022年7月20日。
 */

import { FreeKeyObject } from "./FreeKeyObject"


/**
 * 节点标签枚举。
 */
export enum NodeTag {
    NUL = 'nul', // 未设置。
    PERSON = 'person', // 个人。
    PRIMARY_SCHOOL = 'primary school', // 小学。
    JUNIOR_HIGH = 'junior high', // 初中。
    SENIOR_HIGH = 'senior high', // 高中。
    UNIVERSITY = 'university', // 大学。
    GROUP = 'group' // 普通群组。
}

/**
 * 节点基类。
 */
export class NodeBase {
    name: String = ''
    tag: NodeTag = NodeTag.NUL
    id: number = -1
    relations = new Array<NodeBase>()

    constructor(name: String, tag: NodeTag = NodeTag.NUL, id: number = -1) {
        this.name = name
        this.tag = tag
        this.id = id
    }

    /*
     * 序列化格式：JSON 字符串
     *
     * {
     *     "id": int,
     *     "tag": string,
     *     "name": string,
     *     "relations": [ id: int ]
     *     "gender": int, // optional
     *     "coef": int // optional
     * }
     */

    /**
     * 转为可序列化对象。
     */
    toJsonableObject(): FreeKeyObject {
        let res: FreeKeyObject = {
            name: this.name,
            tag: this.tag,
            id: this.id,
            relations: this.relations.map(it => it.id)
        }

        return res
    }

    /**
     * 添加关系。
     * @param node 对方节点。
     * @param bothSide 是否双向添加。
     */
    addRelation(node: NodeBase, bothSide: boolean = true) {
        if (
            this.relations.map(it => it == node ? 1 : 0)
                .reduce((a: number, b: number) => a + b, 0) == 0
        ) {
            this.relations.push(node)
            if (bothSide) {
                node.relations.push(this)
            }
        }
    }

    /**
     * 解除关系。
     * @param node 对方节点。
     * @param bothSide 是否双向解除。
     */
    removeRelation(node: NodeBase, bothSide: boolean = true) {
        for (let idx = 0; idx < this.relations.length; idx++) {
            if (this.relations[idx] == node) {
                this.relations.splice(idx, 1)
                if (bothSide) {
                    node.removeRelation(this, false)
                }
                break
            }
        }
    }
}
