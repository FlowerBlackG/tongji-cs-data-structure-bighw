/*
 * 个人节点。
 * 2051565 
 * 创建于 2022年7月20日。
 */

import { FreeKeyObject } from "./FreeKeyObject"
import { NodeBase, NodeTag } from "./NodeBase"

/**
 * 性别。
 */
export enum PersonGender {
    MALE = 1,
    FEMALE = 2,
    OTHER = 3
}

/**
 * 个人节点。
 */
export class PersonNode extends NodeBase {
    gender: PersonGender = PersonGender.OTHER

    constructor(
        name: string, gender: PersonGender, id: number = -1
    ) {
        super(name, NodeTag.PERSON, id)
        this.gender = gender
    }

    /**
     * 转换为便于序列化的对象。
     */
    override toJsonableObject(): FreeKeyObject {
        let res = super.toJsonableObject()
        res.gender = this.gender
        return res
    }

}
