from copy import deepcopy
from collections import deque, OrderedDict

graf = []
tick = 1
p = 5
maxLevel = 0
criticalPath = 0
CPcopy = criticalPath
procs = []
procs1 = []
matrix = []
dataOnBus = None


class Processor:
    def __init__(self, no, performance):
        self.procActive = False
        self.sendEndTime = 0
        # КВВ
        self.IOC = []

        self.taskQueue = []
        self.hasMarker = False
        self.isSending = False
        self.sendingFrom = -1
        self.sendingTo = -1
        self.waitingFrom = -1
        self.waitingFor = -1
        self.receiveEndTime = 0
        self.currentTask = None
        self.hasPacketToSend = False
        self.packetSent = False

        self.taskEndTime = 0
        # receiver\sender\seen
        self.localMemory = []
        self.mail = 0
        self.over = 0

        self.no = no
        from random import randrange
        # self.performance = randrange(1, 3)
        self.performance = 1

        print("Processor {} performance {}".format(self.no, self.performance))
        self.taskQueue.clear()

    def execute(self, task):
        self.currentTask = task
        self.procActive = True
        self.taskEndTime = tick + task.size * int(self.performance)

    def handle(self):
        # print(self.no)
        global procEnded, dataOnBus
        if self.over:
            return

        if self.taskEndTime == tick:
            for index, j in enumerate(self.currentTask.connections):
                packet = [j, self.currentTask.no, self.currentTask.connectionWeight[index]]
                if self.onProc(j):
                    self.localMemory.insert(0, packet)
                    self.mail += 1
                else:
                    # ready to send
                    self.IOC.append(packet)
                    self.hasPacketToSend = 1
                    if marker.isOccupied is True:
                        marker.ask_marker(self.no)
                    else:
                        marker.onProc = self.no
                    # return
            self.currentTask = None
            self.procActive = False
            # return
        else:
            pass

        if self.isSending:
            if self.sendEndTime == tick:
                self.isSending = False
                # marker.isOccupied = А

                if not self.packetSent:
                    self.IOC.pop(0)
                    self.packetSent = True
                if not self.IOC:
                    self.hasPacketToSend = 0
                self.sendingFrom = -1
                self.sendingTo = -1
            elif self.sendEndTime == tick + 1:
                marker.canFree = True
                dataOnBus = self.IOC[0]
                return
            else:
                return

        elif self.hasPacketToSend:
            if marker.onProc == self.no:
                self.sendEndTime = tick + self.IOC[0][2] * int(self.performance)
                self.sendingFrom = self.IOC[0][1]
                self.sendingTo = self.IOC[0][0]
                self.isSending = True
                marker.isOccupied = True
                if self.sendEndTime == tick + 1:
                    marker.canFree = True
                    dataOnBus = self.IOC.pop(0)
                    self.packetSent = True
                else:
                    self.packetSent = False
                return
            else:
                # wait for acess
                return

        if not self.currentTask:
            if self.taskQueue:
                while self.mail:
                    for i in self.taskQueue:
                        if i.no == self.localMemory[0][0]:
                            i.parentsMap[i.parentsNo.index(self.localMemory[0][1])] = 1
                            self.localMemory[0][2] = 1
                            self.mail -= 1
                    self.localMemory.pop(0)
                if all(self.taskQueue[0].parentsMap):
                    self.execute(self.taskQueue.pop(0))
                    self.waitingFor = -1
                    self.waitingFrom = -1
                else:
                    next_task = self.taskQueue[0]
                    self.waitingFor = next_task.no
                    self.waitingFrom = ",".join([str(next_task.parentsNo[index]+1) for index, i in enumerate(next_task.parentsMap) if i == 0])
            elif not (self.isSending or self.hasPacketToSend):
                self.over = 1
                procEnded -= 1

    def onProc(self, j):
        for i in self.taskQueue:
            if i.no == j: return True
        return False


class Task:
    def __init__(self, v):
        ready = False
        active = False

        self.parentsMap = []
        self.parentsNo = []

        self.no = v.no
        self.size = v.wv
        self.connectionWeight = v.wu
        # parents and state (completed or not)
        self.connections = v.u


class V:
    # no - index, wv - weight, u - edge to, wu - edge weight
    def __init__(self, no, wv, u, wu):
        self.no = no
        self.wv = wv
        self.u = u
        self.wu = wu
        self.parent = []
        self.level = 0
        self.path = 0
        self.adU = 0
        self.isClusterized = 0
        self.static_level = 0


def staticLevel(vertex):
    if not vertex.u:
        vertex.static_level = vertex.wv
        return vertex.wv
    for i in vertex.u:
        if not graf1[i].static_level:
            staticLevel(graf1[i])
        tmp0 = vertex.wu[vertex.u.index(graf1[i].no)]
        tmp = graf1[i].static_level + tmp0 + vertex.wv
        if tmp > vertex.static_level:
            vertex.static_level = tmp

    return vertex.path


class ClusterManager():
    cell = 1
    clusterizedV = set()
    # first cell is for unclastered
    clusters = [None]

    @classmethod
    def printClusters(self):
        for index, i in enumerate(self.clusters):
            if not index:
                print(' Unclastered nodes: ', end='')
                for j in i:
                    print('[{0}]'.format(j.no+1), end=' ')
                print('. ', end='')
            else:
                print(' Кластер {0}: '.format(index), end='')
                for j in i:
                    print('[{0}]'.format(j.no+1), end=' ')
                print('. ', end='')
        print('')

    @classmethod
    def getClusters(cls):
        clusters = OrderedDict()
        for index, i in enumerate(cls.clusters):
            if not index:
                clusters["Unclastered"] = ['[{0}]'.format(j.no+1) for j in i]
            else:
                clusters["Cluster {}".format(index)] = ['[{0}]'.format(j.no+1) for j in i]

        return clusters

    @classmethod
    def zeroing(self, vertex, cluster):
        for i in cluster:
            for index, j in enumerate(i.u):
                if vertex.no == j:
                    i.wu[index] = 0

        for index, i in enumerate(vertex.u):
            for k in cluster:
                if i == k.no:
                    vertex.wu[index] = 0



    @classmethod
    def unzeroing(self, vertex, cluster):
        for i in cluster:
            for index, j in enumerate(i.u):
                if vertex.no == j:
                    i.wu[index] = matrix[i.no][j]
        for index, i in enumerate(vertex.u):
            for k in cluster:
                if i == k.no:
                    matrix[vertex.no][k.no]
                    vertex.wu[index] = matrix[vertex.no][k.no]
                    # to  from

    @classmethod
    def clusterize(self, v1, v2):
        if v1.no==12:
            pass
        global CPcopy, graf1
        if v1.isClusterized and v2.isClusterized:

            cluster1 = self.clusters[v1.isClusterized]
            cluster2 = self.clusters[v2.isClusterized]

            if v1.isClusterized == v2.isClusterized: return
            # соединяем два кластера
            # обнуляем ребра на первом кластере и на втором
            for i in cluster1:
                self.zeroing(i, cluster2)

            # добавляем вершины в кластер
            cluster1.extend(cluster2)

            # сортируем
            graf1 = deepcopy(graf)
            for k in graf1:
                k.static_level = 0
                while k.adU:
                    k.u.pop(-1)
                    k.wu.pop(-1)
                    k.adU -=1
            for index, k in enumerate(cluster1):
                for j in graf1:
                    if k.no == j.no:
                        tmp1 = j
                #staticLevel(k)
                k.static_level = staticLevel(tmp1) - tmp1.wv
            cluster1.sort(key=lambda x: -x.static_level)

            # добавляем ребра, чтобы ссимулировать последовательность
            # для дальнейшего расчета КП
            edge_array=[]

            for index, i in enumerate(cluster1[:-1]):
                if cluster1[index+1].no not in i.u:
                    i.u.append(cluster1[index+1].no)
                    i.wu.append(0)
                    i.adU += 1
                    edge_array.append(index)

            cp1 = find_critical_path()

            if cp1 <= CPcopy:
                # меняем параметр isClusterized  и соединяем петушков

                self.clusters.remove(cluster2)
                CPcopy = find_critical_path()

            else:
                for index, i in enumerate(cluster1):
                    if i in cluster2: continue
                    self.unzeroing(i, cluster2)
                # удаляем ребра
                for j in edge_array:
                    for index, i in enumerate(cluster1):
                        if j == index:
                            i.u.remove(i.u[-1])
                            i.wu.remove(i.wu[-1])
                            i.adU -= 1
                            continue
                del edge_array
                for i in cluster2:
                    cluster1.remove(i)


        elif v1.isClusterized:
            #print(v1)

            cluster1= self.clusters[v1.isClusterized]
            self.zeroing(v2, cluster1)

            cluster1.append(v2)
            graf1 = deepcopy(graf)
            for k in graf1:
                k.static_level = 0
                while k.adU:
                    k.u.pop(-1)
                    k.wu.pop(-1)
                    k.adU -= 1
            for index, k in enumerate(cluster1):
                for j in graf1:
                    if k.no == j.no:
                        tmp1 = j
                # staticLevel(k)
                k.static_level = staticLevel(tmp1) - tmp1.wv
            cluster1.sort(key=lambda x: -x.static_level)


            # добавляем ребра, чтобы ссимулировать последовательность
            # для дальнейшего расчета КП
            edge_array = []

            for index, i in enumerate(cluster1[:-1]):
                if cluster1[index + 1].no not in i.u:
                    i.u.append(cluster1[index + 1].no)
                    i.wu.append(0)
                    i.adU += 1
                    edge_array.append(index)

            newCp = find_critical_path()
            if newCp <= CPcopy:

                self.clusters[0].remove(v2)

            else:
                self.unzeroing(v2, cluster1)
                # удаляем ребра
                for j in edge_array:
                    for index, i in enumerate(cluster1):
                        if j == index:
                            i.u.remove(i.u[-1])
                            i.wu.remove(i.wu[-1])
                            i.adU -= 1
                            continue
                del edge_array

                cluster1.remove(v2)

        elif v2.isClusterized:
            # обнуляем
            cluster2 = self.clusters[v2.isClusterized]
            self.zeroing(v1, cluster2)

            cluster2.append(v1)
            graf1 = deepcopy(graf)
            for k in graf1:
                k.static_level = 0
                while k.adU:
                    k.u.pop(-1)
                    k.wu.pop(-1)
                    k.adU -= 1
            for index, k in enumerate(cluster2):
                for j in graf1:
                    if k.no == j.no:
                        tmp1 = j
                # staticLevel(k)
                k.static_level = staticLevel(tmp1) - tmp1.wv
            cluster2.sort(key=lambda x: -x.static_level)

            # добавляем ребра, чтобы ссимулировать последовательность
            # для дальнейшего расчета КП
            edge_array=[]

            for index, i in enumerate(cluster2[:-1]):
                if cluster2[index+1].no not in i.u:
                    i.u.append(cluster2[index+1].no)
                    i.wu.append(0)
                    i.adU += 1
                    edge_array.append(index)
            print(v1, v2)
            newCp = find_critical_path()
            if newCp <= CPcopy:

                cluster_array = []
                if v1 not in cluster2:
                    cluster_array.append(v1)
                cluster_array.extend(cluster2)

                self.clusters.pop(v2.isClusterized)
                self.clusters.append(cluster_array)

                self.clusters[0].remove(v1)

            else:
                self.unzeroing(v1, cluster2)
                # удаляем ребра
                for j in edge_array:
                    for index, i in enumerate(cluster2):
                        if j == index:
                            i.u.remove(i.u[-1])
                            i.wu.remove(i.wu[-1])
                            i.adU -= 1
                            continue
                del edge_array

                cluster2.remove(v1)

        # создаем новый кластер
        else:

            self.zeroing(v1, [v2])
            newCp = find_critical_path()
            if newCp <= CPcopy:
                self.clusters.append([v1, v2])


                self.clusters[0].remove(v1)
                self.clusters[0].remove(v2)

            else:
                self.unzeroing(v1, [v2])
                return

        # синхронизируем номера кластеров у вершин
        for index, i in enumerate(self.clusters):
            if index == 0: continue
            for j in i:
                j.isClusterized = index

        CPcopy = find_critical_path()


class BusController:
    isOccupied = False
    onProc = 0
    canFree = False
    queue = deque()

    @classmethod
    def ask_marker(cls, processor_number):
        cls.queue.append(processor_number)


def build_constructed_graph(g):
    global graf, matrix
    nodes = g.nodes.all()
    print("{} nodes".format(len(nodes)))
    for node in nodes:
        no = node.index - 1
        wv = node.weight
        u = []
        wu = []
        for e in node.out_edges.all():
            u.append(e.to_node.index - 1)
            wu.append(e.weight)
            print("no: {}; u: {}; wu: {}".format(no, u, wu))
        graf.append(V(no, wv, u, wu))

    # print(graf)
    # import time
    # time.sleep(60)

    matrix = [[0 for i in range(len(graf))] for j in range(len(graf))]
    # устанавливаем родителей
    for i in graf:
        for j in graf:
            if i.no in j.u:
                i.parent.append(j.no)

    for index, i in enumerate(graf):
        for index1, j in enumerate(i.u):
            #print('i={0} j={1}'.format(i,j))
            if i.no == 14:
                pass
            matrix[i.no][j] = i.wu[index1]
    ClusterManager.clusters[0] = []
    for i in graf:
        ClusterManager.clusters[0].append(i)


def setMax(maxL):
    global maxLevel
    maxLevel = maxL if maxL > maxLevel else maxLevel


def level(g, vertex):
    if vertex.level:
        return
    # print(vertex.no)
    maxL = 0
    for i in vertex.parent:
        v = g[i].level
        # print('     ',v)
        if not v:
            level(g, g[i - 1])
        maxL = v if v > maxL else maxL
        setMax(maxL)
    vertex.level = maxL + 1


def successorMaxPath(vertex):
    if not vertex.u:
        vertex.path = vertex.wv
        return vertex.wv
    for i in vertex.u:
        if not graf[i].path:
            successorMaxPath(graf[i])
        tmp = graf[i].path + vertex.wu[vertex.u.index(graf[i].no)] + vertex.wv
        if tmp > vertex.path:
            vertex.path = tmp

    return vertex.path


# уровни от 1 - оо
def find_critical_path():
    # сначала wipe
    for i in graf:
        i.path = 0
    t = 0
    tmp = 0
    for i in graf:
        if not i.parent:
            tmp = successorMaxPath(i)
        if tmp > t: t = tmp
    return t


def findTask(k):
    for index, i in enumerate(procs):
        for j in i.taskQueue:
            if j.no == k: return index
    return -1


def send(param):
    global dataOnBus
    p = procs[findTask(param[0])]
    p.localMemory.insert(0, param)
    p.mail += 1
    dataOnBus = None


def setParents():
    for i in graf:
        for j in i.u:
            for k in graf:
                if j == k.no:
                    pass
    for i in procs:
        for j in i.taskQueue:
            t = j.no
            for k in procs:
                for q in k.taskQueue:
                    if t in q.connections:
                        j.parentsNo.append(q.no)
                        j.parentsMap.append(0)


def load_tasks():
    global p
    for index1, i in enumerate(reversed(ClusterManager.clusters)):
        if index1 == len(ClusterManager.clusters) - 1:
            # unclastered to different processors
            for index2, j in enumerate(i):
                c = Processor(index1 + index2,1)
                c.taskQueue.append(Task(j))
                procs.append(c)
        else:
            c = Processor(index1, 1)
            for j in i:
                c.taskQueue.append(Task(j))
            procs.append(c)

    p = len(procs)
    setParents()


def optimize_graph():
    cpool = ClusterManager()
    edges = {}
    # all edges
    for i in graf:
        for index, j in enumerate(i.u):
            if i.wu[index] not in list(edges.keys()):
                edges[i.wu[index]] = []
            edges[i.wu[index]].append([i.no, j])
    global_use = 1

    while global_use:
        global_use = 0
        for i in reversed(sorted(edges.keys())):
            if i == 0: continue

            useful = 1
            while useful and edges[i]:
                useful = 0
                for j in edges[i]:
                    _from = j[1]
                    _to = j[0]
                    t1 = CPcopy
                    cpool.clusterize(graf[_to], graf[_from])
                    # success or fail
                    local_use = 1 if t1 - CPcopy > 0 else 0

                    if local_use:
                        edges[i].remove(j)
                        useful +=1
                        global_use +=1
                    else:
                        pass


def convert_status_word(word):
    if word[1]:
        res = '{:<2}'.format(word[1].no + 1)
    else:
        if word[5] > 0:
            res = '{}<-{}'.format(word[5] + 1, word[6])
        elif word[2]:
            res = '{}->{}'.format(word[3] + 1, word[4] + 1)
        else:
            res = '-'
    return res


marker = BusController()


def perform_simulation(g=None):
    global tick, procEnded, dataOnBus, CPcopy

    build_constructed_graph(g)

    CPcopy = find_critical_path()
    print(CPcopy)

    optimize_graph()

    load_tasks()

    ClusterManager.printClusters()
    procEnded = len(procs)
    status_word = [0 for i in procs]
    table = []

    while procEnded:

        if marker.canFree is True:
            marker.isOccupied = False
            marker.canFree = False

        if marker.isOccupied is False:
            # marker.onProc = procs[marker.onProc - 1].no
            # check queue
            if len(marker.queue) > 0:
                next_proc = marker.queue.popleft()
                marker.onProc = next_proc
                # marker.isOccupied = True
            else:
                marker.onProc = -1

        # print('Такт - {0}. Маркер у П{1}'.format(tick, marker.onProc))
        if dataOnBus:
            send(dataOnBus)
        for index, i in enumerate(procs):
            i.handle()
            status_word[index] = [i.no == marker.onProc, i.currentTask, i.isSending,
                                      i.sendingFrom, i.sendingTo, i.waitingFor, i.waitingFrom]
        table.append([convert_status_word(w) for w in status_word])
        tick += 1

    # print(find_critical_path())

    return {
        "table": table,
        "clusters": ClusterManager.getClusters()
    }


if __name__ == "__main__":
    perform_simulation()