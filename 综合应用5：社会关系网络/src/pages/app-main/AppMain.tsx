/*
 * 应用主页。
 * 2051565 
 * 创建于 2022年7月20日。
 */

import { CloseOutlined, DeleteOutlined, DownloadOutlined, ImportOutlined, InfoCircleOutlined, PlusOutlined, SaveOutlined, StarOutlined, UnorderedListOutlined } from '@ant-design/icons'
import { Button, Drawer, Input, message, Modal, notification, Select, Upload } from 'antd'
import { DefaultOptionType } from 'antd/lib/select'
import { RcFile } from 'antd/lib/upload'
import { FilterFunc } from 'rc-select/lib/Select'
import React from 'react'
import { RelationChart } from '../../components/RelationChart'
import { FreeKeyObject } from '../../data-structure/FreeKeyObject'
import { GroupNode } from '../../data-structure/GroupNode'
import { NodeBase, NodeTag } from '../../data-structure/NodeBase'
import { NodeManager } from '../../data-structure/NodeManager'
import { PersonGender, PersonNode } from '../../data-structure/PersonNode'
import { MacroDefines } from '../../MacroDefines'
import './AppMain.css'

const { Option } = Select

type AppState = {
    /** 聚焦的节点。 */
    nodeSelected: NodeBase | null,

    /** 关系列表抽屉是否可见。 */
    relationDrawerVisible: boolean,

    /** 好友推荐抽屉是否可见。 */
    recommendFriendDrawerVisible: boolean
}

/**
 * 应用主页。含大部分逻辑。
 */
export default class AppMain extends React.Component<any, AppState>
{
    state: AppState = {
        nodeSelected: null,
        relationDrawerVisible: false,
        recommendFriendDrawerVisible: false
    }

    /** 指向图表对象的引用。 */
    private chartRef: React.RefObject<RelationChart>

    /**
     * 节点管理器。含用户和组织。
     */
    private nodeManager = new NodeManager

    /**
     * 窗口大小变更警告锁。
     * 锁开时，不弹出警告。
     */
    private resizeWarningMsgLock = false

    /**
     * 好友推荐列表。
     */
    private recommendList = new Array<FreeKeyObject>()

    /**
     * 好友推荐列表是否过期。
     * 仅当过期时，在打开抽屉时更新列表。
     * 
     * 在推荐页添加好友后，要通过强制刷新使刚添加的好友从推荐列表离开。
     * 但是重新渲染可能会导致推荐列表被重新计算，从而被打乱，因此加入简单的缓存和锁机制。
     */
    private recommendListExpired = true

    /**
     * 构造。
     */
    constructor(props: any) {
        super(props)

        // 绑定引用。
        this.chartRef = React.createRef()

        // 首先弹出一个使用说明。
        Modal.info({
            title: '欢迎体验社会关系网络演示',
            okText: '好的',
            closable: true,
            maskClosable: true,
            centered: true,
            content: <div>
                作者：2051565<br/>
                《数据结构课程设计》组成部分<br />
                <br />
                使用前，请认真阅读以下内容：<br />
                1. 为方便体验，可点击右上角按钮获取预置数据集 .sndat 文件，
                然后点击页面内“导入”按钮，加载下载的文件。<br />
                <br />
                本页内容及样例数据仅供技术试验，与实际人物与组织无关，请勿对号入座。
            </div>,
            icon: <InfoCircleOutlined style={{ color: MacroDefines.PRIMARY_COLOR }} />
        })
        
        // 注册成员函数。
        this.resizeUpdate = this.resizeUpdate.bind(this)
        this.generateNodeBoxes = this.generateNodeBoxes.bind(this)
        this.showAddPersonModal = this.showAddPersonModal.bind(this)
        this.showAddOrganizationModal = this.showAddOrganizationModal.bind(this)
        this.autoUpdateChart = this.autoUpdateChart.bind(this)
        this.tryRemoveRelation = this.tryRemoveRelation.bind(this)
        this.tryAddRelation = this.tryAddRelation.bind(this)
        this.recommendFriendDrawer = this.recommendFriendDrawer.bind(this)
    }

    /**
     * 自动选择合适的方案向图表对象发送更新信号。
     */
    private autoUpdateChart(node: NodeBase | null = this.state.nodeSelected) {
        if (node == null) {
            this.chartRef.current?.showGlobalRelationGraph(
                this.nodeManager.nodes
            )
        } else {
            this.chartRef.current?.showPersonRelationGraph(node)
        }
    }

    /**
     * 展示“添加组织”对话框。
     */
    private showAddOrganizationModal() {
        let commonStyle = {
            marginTop: 12
        }

        let nodeTag = NodeTag.NUL
        let coef = 1.0
        let name = ''

        Modal.info({
            title: '添加组织',
            centered: true,
            closable: true,
            maskClosable: true,
            okText: '添加',
            onOk: () => {
                if (name.replace(/(^s*)|(s*$)/g, '').length == 0) {
                    message.warn('名称为空。不保存。')
                } else if (nodeTag == NodeTag.NUL) {
                    message.warn('未选择类别。不保存。')
                } else {
                    this.nodeManager.insert(new GroupNode(
                        name, nodeTag, coef
                    ))
                }

                
                this.autoUpdateChart()

                this.forceUpdate()
            },
            content: <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                <Input 
                    placeholder='名称' 
                    style={commonStyle} 
                    onChange={ (event: any) => name = event.target.value }
                />

                <Input 
                    placeholder='关联系数（默认为 1，可不更改）' 
                    style={commonStyle} 
                    maxLength={9}
                    type='number'
                    onChange={ (event: any) => {
                        coef = Number(event.target.value)
                    }}
                />

                <Select
                    placeholder='选择类别'
                    style={commonStyle}
                    onChange={(value: NodeTag) => {
                        nodeTag = value    
                    }}
                >
                    {
                        [
                            {
                                key: NodeTag.PRIMARY_SCHOOL,
                                name: '小学'
                            },
                            
                            {
                                key: NodeTag.JUNIOR_HIGH,
                                name: '初中'
                            },

                            {
                                key: NodeTag.SENIOR_HIGH,
                                name: '高中'
                            },

                            {
                                key: NodeTag.UNIVERSITY,
                                name: '大学'
                            },

                            {
                                key: NodeTag.GROUP,
                                name: '群组'
                            }
                            
                        ].map(item => {
                            return <Option value={item.key}>
                                {item.name}
                            </Option>
                        })
                    }
                </Select>
            </div>
        })
    }

    /**
     * 展示添加一个人的弹框。
     */
    private showAddPersonModal() {

        let commonStyle: React.CSSProperties = {
            marginTop: 12
        }

        let searchFilter: FilterFunc<DefaultOptionType> = (input, option) => {
            return (option!.children as unknown as string).includes(input)
        }

        let schoolNodeIdMap = new Map<NodeTag, number>()
        schoolNodeIdMap.set(NodeTag.PRIMARY_SCHOOL, -1)
        schoolNodeIdMap.set(NodeTag.JUNIOR_HIGH, -1)
        schoolNodeIdMap.set(NodeTag.SENIOR_HIGH, -1)
        schoolNodeIdMap.set(NodeTag.UNIVERSITY, -1)

        let name = ''
        let gender = PersonGender.OTHER

        Modal.info({
            title: '添加用户',
            centered: true,
            closable: true,
            maskClosable: true,
            okText: '添加',
            onOk: () => {
                if (name.replace(/(^s*)|(s*$)/g, '').length == 0) {
                    message.warn('名称为空。不保存。')
                } else {
                    let node = new PersonNode(name, gender)
                    this.nodeManager.insert(node)

                    // 绑定组织关系。
                    let priSchool = this.nodeManager.getNodeById(
                        schoolNodeIdMap.get(NodeTag.PRIMARY_SCHOOL)!
                    )
                    if (priSchool != null) {
                        node.addRelation(priSchool)
                    }
                    
                    let juSchool = this.nodeManager.getNodeById(
                        schoolNodeIdMap.get(NodeTag.JUNIOR_HIGH)!
                    )
                    if (juSchool != null) {
                        node.addRelation(juSchool)
                    }
                    
                    let seSchool = this.nodeManager.getNodeById(
                        schoolNodeIdMap.get(NodeTag.SENIOR_HIGH)!
                    )
                    if (seSchool != null) {
                        node.addRelation(seSchool)
                    }
                    
                    let univSchool = this.nodeManager.getNodeById(
                        schoolNodeIdMap.get(NodeTag.UNIVERSITY)!
                    )
                    if (univSchool != null) {
                        node.addRelation(univSchool)
                    }
                    
                    this.autoUpdateChart()

                    this.forceUpdate()
                }
            },
            content: <div 
                style={{
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                }}
            >

                <Input 
                    placeholder='名称' 
                    style={commonStyle} 
                    onChange={ (event: any) => name = event.target.value }
                />
                 
                <Select
                    placeholder='选择性别（默认为“其他”）'
                    style={commonStyle}
                    onChange={(value: PersonGender) => {
                        gender = value    
                    }}
                >
                    <Option value={PersonGender.MALE} key={1}>男</Option>
                    <Option value={PersonGender.FEMALE} key={2}>女</Option>
                    <Option value={PersonGender.OTHER} key={3}>其他</Option>
                </Select>
                    
                { // 为小学到大学各自生成一个下拉选择框。
                    [
                        {
                            key: NodeTag.PRIMARY_SCHOOL,
                            name: '小学'
                        },
                        
                        {
                            key: NodeTag.JUNIOR_HIGH,
                            name: '初中'
                        },

                        {
                            key: NodeTag.SENIOR_HIGH,
                            name: '高中'
                        },

                        {
                            key: NodeTag.UNIVERSITY,
                            name: '大学'
                        }
                    ].map(item => {
                        return <Select
                            showSearch
                            placeholder={'选择' + item.name + '（可为空）'}
                            optionFilterProp='label'
                            filterOption={ searchFilter }
                            style={{
                                marginTop: 12,
                            }}
                            onChange={(value: number) => {
                                schoolNodeIdMap.set(item.key, value)
                                console.log(schoolNodeIdMap)
                            }}
                            allowClear
                        >{
                            this.nodeManager.nodes.map(node => { // 选项。
                                return node.tag != item.key ? '' : <Option
                                    value={node.id}
                                    key={node.id}
                                >{node.name}</Option>
                            }) 
                        }</Select>
                    })
                }
            </div>

        })
    }

    /**
     * 生成一个节点容器。容器内包含：
     *   标题
     *   节点卡片
     *   添加节点按钮
     */
    private generateNodeBox(usage: 'person' | 'organization') {

        return <div 
            className='nodeBox normalCard'
        >
            <Button type='primary' 
                style={{
                    position: 'absolute',
                    right: 6,
                    bottom: 6,
                    boxShadow: '0px 4px 10px #0005'
                }}
                shape='circle'
                icon={<PlusOutlined />}
                onClick={
                    () => {
                        usage == 'person' ? 
                            this.showAddPersonModal() 
                            : this.showAddOrganizationModal()
                    }
                }
            />

            <div style={{
                color: '#fff',
                fontSize: 22,
                textAlign: 'center'
            }}>{usage == 'person' ? '用户' : '组织'}</div>

            <div className='scrollViewCommon scrollY' 
                style={{ 
                    flexGrow: 1,
                    overflowX: 'hidden',
                    width: '100%',
                }}
            >
                
                <div style={{display:'flex', flexDirection:'column'}}> {   
                    // 盒子内部的卡片。组织和个人。
                    this.nodeManager.nodes.map(node => {
                        let tagIsPerson = node.tag == NodeTag.PERSON
                        if (
                            (!tagIsPerson && usage == 'organization')
                            || (tagIsPerson && usage == 'person')
                        ) {

                            return <div 
                                className='nodeCard'
                                style={{
                                    userSelect: 'none'
                                }}
                                onClick={() => {
                                    this.setState({
                                        nodeSelected: node
                                    })

                                    this.chartRef.current!.showPersonRelationGraph(
                                        node
                                    )
                                }}
                                key={node.id}
                            >{node.name}</div>
                        }
                    })
                }</div>

            </div>
        </div>
    }

    /**
     * 生成两个节点盒子并返回。
     */
    private generateNodeBoxes () {
        return <div style={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '80%',
            justifyContent: 'space-between'
        }}> 

            {this.generateNodeBox('person')}
            {this.generateNodeBox('organization')}

        </div>
    }

    /**
     * 从数据文件导入数据。
     * @param file 文件对象。
     */
    private importFile(file: RcFile) {
        let fileReader = new FileReader()

        fileReader.onload = () => {
            try {
                this.nodeManager.import(
                    // 直接转换会被视为转换 object。需要先强转为字符串。
                    JSON.parse(JSON.stringify(fileReader.result))
                )
                
                this.setState({
                    nodeSelected: null
                })
                this.autoUpdateChart()
                this.forceUpdate()
            } catch (_: any) {
                console.log(_)
                message.error('导入失败。请检查文件格式。')
            }
        }

        fileReader.readAsText(file, 'utf-8')
    }

    /**
     * 好友推荐抽屉。
     * @param center 给谁推荐。为空时不做任何处理。
     * @returns 生成的 react 节点对象。center 为空时，返回为 null。
     */
    private recommendFriendDrawer(
        center: NodeBase | null = this.state.nodeSelected
    ) {
        if (center == null || !this.state.recommendFriendDrawerVisible) {
            return
        }

        // 过期再刷新，防止“闪屏”。
        if (this.recommendListExpired) {

            /*
                好友指数列表。指数越高，越是潜在好友。不含已经是好友的。
                  object 内容：
                    friendIndex: number 综合指数
                    commonFriendCount: number
                    commonOrganizationCount: number
            */

            let relationIndexMap = new Map<NodeBase, FreeKeyObject>()

            center.relations.forEach(friend => {
                friend.relations.forEach(secFriend => {
                    if (
                        secFriend.tag == NodeTag.PERSON 
                        && !center.relations.includes(secFriend)
                        && secFriend != center // 自己别跟自己交好友吧...
                    ) {
                        let fkObj: FreeKeyObject = 
                            relationIndexMap.has(secFriend) ?
                                relationIndexMap.get(secFriend)! 
                                : {
                                    idx: 0,
                                    commonFriends: 0,
                                    commonOrganizations: 0,
                                    node: secFriend
                                }

                        if (friend.tag == NodeTag.PERSON) {
                            fkObj.idx += 0.8
                            fkObj.commonFriends++
                        } else {
                            fkObj.idx += (friend as GroupNode).relationCoefficient
                            fkObj.commonOrganizations++
                        }
                        
                        relationIndexMap.set(secFriend, fkObj)
                    }
                })
            })

            this.recommendListExpired = false
            this.recommendList.length = 0
            relationIndexMap.forEach(it => {
                this.recommendList.push(it)
            })
            this.recommendList.sort((a: FreeKeyObject, b: FreeKeyObject) => {
                return b.idx - a.idx
            })
        }

        return <Drawer
            title={center.name + '的推荐好友'}
            placement='left'
            closable={true}
            visible={this.state.relationDrawerVisible}
            onClose={() => { 
                this.setState({ recommendFriendDrawerVisible: false })
                this.recommendListExpired = true
            }}
        >
            <div style={{
                display: 'flex',
                flexDirection: 'column'
            }}>{
                
                this.recommendList.map((result, index) => {
                    return <div
                        style={{
                            width: '100%',
                            height: 84,
                            position: 'relative'
                        }}
                    >
                        <div
                            style={{
                                position: 'absolute',
                                left: 12,
                                top: 12,
                                fontSize: 18
                            }}
                        >{result.node.name}</div>

                        <Button shape='circle' icon={<PlusOutlined />}
                            style={{
                                position: 'absolute',
                                right: 12,
                                top: 12
                            }}
                            type='primary'
                            onClick={() => {
                                result.node.addRelation(center)
                                for (let idx = 0; idx < this.recommendList.length; idx++)
                                {
                                    console.log(this.recommendList[idx])
                                    if (this.recommendList[idx] == result) {
                                        this.recommendList.splice(idx, 1)
                                        break
                                    }
                                }   

                                this.autoUpdateChart()
                                this.forceUpdate()
                            }}
                        />

                        <div style={{
                            position: 'absolute',
                            left: 12,
                            bottom: 12,
                        }}>
                            {
                                '推荐指数：' + result.idx + '（' 
                                + result.commonFriends + '名共同好友，' 
                                + result.commonOrganizations + '个共同组织）'
                            }
                        </div>

                        { // 分隔线。
                            index + 1 == this.recommendList.length ? '' :
                                <div style={{
                                    width: '100%',
                                    background: '#0002',
                                    height: 1,
                                    position: 'absolute',
                                    bottom: 0
                                }} />
                        }
                    </div>
                })

            }</div>

        </Drawer>
    }

    /**
     * 节点信息盒子。
     * @param node 要展示的节点。
     */
    private nodeDataBox(node: NodeBase | null = this.state.nodeSelected) {
        return <div style={{
            height: '100%',
            left: 12,
            width: 'calc(100% - 36px - 82px)',
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                color: '#fff',
                fontSize: 16
            }}>{
                node == null ? '选择组织或个人' : node.name + '（' +
                    (node.tag == NodeTag.PERSON ? 
                        (
                            node.relations
                                .map(it => it.tag == NodeTag.PERSON ? 1 : 0)
                                .reduce((a: number, b: number) => a + b, 0) 
                            + '好友，加入' +
                            node.relations
                                .map(it => it.tag == NodeTag.PERSON ? 0 : 1)
                                .reduce((a: number, b: number) => a + b, 0)
                            + '个组织'
                        )
                        : node.relations.length + '名成员'
                    )
                    + '）'
            }</div>

            <div style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 4
            }}>
                <Button ghost={node == null}
                    shape='round'
                    icon={<UnorderedListOutlined />}
                    onClick={() => {
                        this.setState({
                            relationDrawerVisible: true // 开启抽屉。
                        })
                    }}
                    disabled={node == null}
                    type={node == null ? undefined : 'primary'}
                >关系列表</Button>

                <Button ghost={node == null} style={{marginLeft: 8}}
                    icon={<CloseOutlined />}
                    shape='round'
                    onClick={() => {
                        this.setState({
                            nodeSelected: null
                        })

                        this.autoUpdateChart(null)
                    }}
                    disabled={node == null}
                    type={node == null ? undefined : 'primary'}
                >取消选择</Button>

                <Button 
                    ghost={node == null} shape='round' 
                    type={node == null ? undefined : 'primary'}
                    icon={<DeleteOutlined />} 
                    style={{marginLeft: 8}}
                    onClick={() => {
                        Modal.confirm({
                            title: '删除：' + node!.name,
                            content: '此操作不可被撤销。',
                            okText: '删除',
                            okType: 'danger',
                            cancelText: '取消',
                            closable: true,
                            maskClosable: true,
                            centered: true,
                            onOk: () => {
                                this.setState({
                                    nodeSelected: null
                                })

                                this.autoUpdateChart(null)
                                this.nodeManager.remove(node!)
                            }
                        })
                    }}
                    disabled={node == null}
                    danger={node != null}
                >删除</Button>
            </div>

        </div>
    }

    /**
     * 用户尝试移除关系。弹出确认框。
     * @param sourceNode 
     * @param targetNode 
     */
    private tryRemoveRelation(sourceNode: NodeBase, targetNode: NodeBase) {
        Modal.confirm({
            title: '删除' + sourceNode.name + '与' + targetNode.name + '的关系',
            content: '此操作不可被撤销。',
            okText: '删除',
            okType: 'danger',
            cancelText: '取消',
            closable: true,
            maskClosable: true,
            centered: true,
            onOk: () => {
                sourceNode.removeRelation(targetNode)
                this.autoUpdateChart()
                this.forceUpdate()
            }
        })
    }

    /**
     * 用户尝试添加一个关系。弹出选择框。
     * @param node 
     * @param identifier 
     */
    private tryAddRelation(
        node: NodeBase, identifier: string
    ) {
        if (identifier != 'person' && identifier != 'organization') {
            message.error('检测到内部错误。建议刷新网页。')
        }

        // 没有关联到当前节点的节点表。
        let notInListNodes = new Array<NodeBase>()
        this.nodeManager.nodes.filter(it => {
            return (it.tag == NodeTag.PERSON && identifier == 'person')
                || (it.tag != NodeTag.PERSON && identifier == 'organization')
        }).forEach(it => {
            if (!node.relations.includes(it) && it != node) {
            notInListNodes.push(it)
            }
        })

        let idSelected = -1

        let objectTitle = '' // 称呼。
        if (node.tag == NodeTag.PERSON && identifier == 'person') {
            objectTitle = '好友'
        } else if (node.tag == NodeTag.PERSON && identifier == 'organization') {
            objectTitle = '组织'
        } else {
            objectTitle = '成员'
        }

        Modal.info({
            title: '为' + node.name + '添加' + objectTitle,
            centered: true,
            closable: true,
            maskClosable: true,
            okText: '添加',
            onOk: () => {
                if (idSelected < 0) {
                    message.warn('不保存。')
                } else {
                    // 先找到目标节点，然后添加关系。
                    for (let it of notInListNodes) {
                        if (it.id == idSelected) {
                            it.addRelation(node)
                            message.success('关系添加成功。')
                            break
                        }
                    }
                }

                
                this.autoUpdateChart()
                this.forceUpdate()
            },
            content: <Select
                placeholder='选择类别'
                style={{
                    
                }}
                onChange={(value: number) => {
                    idSelected = value
                }}
            >
                {
                    notInListNodes.map(item => {
                        return <Option value={item.id}>
                            {item.name}
                        </Option>
                    })
                }
            </Select>
            
        })
    }

    /**
     * 关系列表抽屉。
     */
    private relationListDrawer() {

        // 如果没有选中任何人，就开摆！（就不渲染抽屉）
        if (this.state.nodeSelected == null) {
            return
        }

        // 被选中节点的关系列表。
        let nodes = this.state.nodeSelected.relations

        return <Drawer
            title={this.state.nodeSelected?.name + '的关系列表'}
            placement='left'
            closable={true}
            visible={this.state.relationDrawerVisible}
            onClose={() => { this.setState({ relationDrawerVisible: false }) }}
        >
            { this.recommendFriendDrawer() }

            <div style={{
                display: 'flex',
                flexDirection: 'column'
            }}>{
                [
                    {
                        title: this.state.nodeSelected.tag == NodeTag.PERSON ?
                            '好友' : '成员',
                        filterTagIsPerson: true,
                        operationIdentifier: 'person'
                    },
                    {
                        title: '组织',
                        filterTagIsPerson: false,
                        operationIdentifier: 'organization'
                    },
                ].filter(it => {
                    return !(
                        it.operationIdentifier == 'organization' 
                        && this.state.nodeSelected!.tag != NodeTag.PERSON
                    )
                }).map(params => {
                    return <div>
                        <div style={{position: 'relative'}}>
                            <div style={{
                                fontSize: 20,
                                marginTop: 10,
                                marginBottom: 10
                            }}>
                                {params.title}
                            </div>
                            <Button shape='circle'
                                icon={<PlusOutlined />}
                                type='primary'
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '50%',
                                    transform: 'translateY(-50%)'

                                }}
                                onClick={() => {
                                    this.tryAddRelation(
                                        this.state.nodeSelected!,
                                        params.operationIdentifier
                                    )
                                }}
                            />

                            {
                                (
                                    this.state.nodeSelected?.tag == NodeTag.PERSON
                                    && params.operationIdentifier == 'person'
                                ) ? <Button shape='round'
                                        type='primary'
                                        style={{
                                            position: 'absolute',
                                            right: 42,
                                            top: '50%',
                                            transform: 'translateY(-50%)'
                                        }}
                                        icon={<StarOutlined />}
                                        onClick={() => {
                                            this.setState({
                                                recommendFriendDrawerVisible: true
                                            })
                                        }}
                                    >推荐好友</Button> 
                                : ''
                            }

                        </div>

                        <div style={{
                            display: 'flex',
                            flexDirection: 'column'
                        }}>{
                            nodes.filter(
                                it => (it.tag == NodeTag.PERSON) == params.filterTagIsPerson
                            ).map(it => {
                                return <div>
                                
                                    <div style={{
                                        marginTop: 0,
                                        marginBottom: 0,
                                        position: 'relative',
                                        height: 48,
                                    }}>
        
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '50%',
                                                transform: 'translateY(-50%)'
                                            }}
                                        >{it.name}</div>
        
                            
                                        <Button shape='circle'
                                            icon={<DeleteOutlined />}
                                            type='primary'
                                            danger
                                            style={{
                                                position: 'absolute',
                                                right: 0,
                                                top: '50%',
                                                transform: 'translateY(-50%)'
        
                                            }}
                                            onClick={() => {
                                                this.tryRemoveRelation(
                                                    this.state.nodeSelected!,
                                                    it
                                                )
                                            }}
                                        />
                                
                                    </div>
                                </div>
                            })
                        }</div>
                    </div>
                
                }) // .map
                
            }</div>
        </Drawer>
    }

    /**
     * React 渲染入口函数。
     */
    override render(): React.ReactNode {

        return <div className='pageContainer'>

            {this.relationListDrawer()}

            <div id='title'>社会关系网络 - 2051565</div>
            <Button 
                id='downloadDemoProfileBtn'
                onClick={() => {
                    notification.info({
                        message: '下一步',
                        description: '点击下方“导入”按钮，选择文件导入。'
                    })

                    let link = document.createElement('a')
                    link.href = 'https://hwc.gardilily.com/socialnet/样例数据.sndat'
                    link.click()
                }}
                type='primary'
                shape='round'
                icon={<DownloadOutlined />}
            >
                下载预置数据集
            </Button>

            <div className='elementContainer'>
                <div className='controlAreaContainer'>

                    {this.generateNodeBoxes()}

                    <div className='functionArea normalCard'>

                        { /* 个人或组织信息卡片。 */ }
                        {this.nodeDataBox()}

                        { /* 导入导出按钮。 */ }
                        <div style={{
                            width: 82,
                            height: '100%',
                            position: 'absolute',
                            right: 12,
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                        }}>
                            <Upload
                                beforeUpload={(file, fileList): boolean => {
                                    this.importFile(file)
                                    return false // 不做 http 上传。
                                }}
                                showUploadList={false}
                                maxCount={1}
                                accept='.sndat'
                            >
                                <Button type='primary' 
                                    style={{
                                        width: '100%',
                                        boxShadow: '0px 4px 10px #0005'
                                    }}
                                    shape='round'
                                    icon={<ImportOutlined />}
                                    onClick={
                                        () => {
                                            // todo
                                        }
                                    }
                                >导入</Button>
                            </Upload>

                            <Button type='primary' 
                                style={{
                                    width: '100%',
                                    boxShadow: '0px 4px 10px #0005',
                                    marginTop: 10
                                }}
                                shape='round'
                                icon={<SaveOutlined />}
                                onClick={
                                    () => {
                                        let jstring = JSON.stringify(
                                            this.nodeManager.toJsonableObject()
                                        )
                                        
                                        let blob = new Blob(
                                            [jstring], {
                                                type: 'application/octet-stream'
                                            }    
                                        )

                                        let url = URL.createObjectURL(blob)
                                        let link = document.createElement('a')
                                        link.href = url
                                        link.download = '关系网络导出.sndat'
                                        link.click()

                                        message.info('导出成功，请保存。')

                                        window.URL.revokeObjectURL(url)
                                    }
                                }
                            >导出</Button>

                        </div>
                    </div>
                </div>

                <RelationChart style={{
                    borderRadius: '12px',
                    background: '#eef7f2af',
                    width: '49.2%',
                    height: '100%',
                    marginLeft: '1.4%',
                    boxShadow: '0px 4px 10px #0005'
                }} ref={this.chartRef} />
            </div>
        </div>
    }

    /**
     * 页面尺寸改变处理。
     * 由于内部组件的绘制依赖原始画面大小，当画面大小改变时，可能无法及时更新。
     * 解决方案：提醒用户刷新浏览器。提醒信息将常驻于页面，直到用户刷新浏览器。
     */
    private resizeUpdate() {
        if (!this.resizeWarningMsgLock) {
            this.resizeWarningMsgLock = true
            notification.error({
                message: '检测到页面尺寸改变',
                description: '请刷新浏览器，否则可能导致显示效果异常。',
                duration: null,
                onClose: () => {
                    message.error({
                        content: '请刷新浏览器，否则可能导致显示效果异常。',
                        duration: 0
                    })
                }
            })

        }
    }

    override componentDidMount() {
        window.addEventListener('resize', this.resizeUpdate)
    }

    override componentWillUnmount() {
        window.removeEventListener('resize', this.resizeUpdate)
    }
}
