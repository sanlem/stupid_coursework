# Граф
from copy import deepcopy
from collections import deque, OrderedDict

graf = []
tick = 1
# количество процессоров
p = 5
maxLevel = 0
criticalPath = 0
CPcopy = criticalPath
procs = []
procs1 = []
matrix = []
# Данные на шине, передадутся в начале след. такта
dataOnBus = None


class Processor:
    def __init__(self, no, performance):
        # True если процессор хочет переслать данные и False если задача выполняется
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
        # здесь хранятся пакеты. формат - КОМУ\ОТ\ПРОЧИТАН
        self.localMemory = []
        # сколько пакетов пришло
        self.mail = 0
        # закончил ли выполнение всех заданий
        self.over = 0

        # порядковый номер процессора в топологии, производительность >=1
        # (кол-во тактов умножается на пр. и округляется вверх)

        self.no = no
        from random import randrange
        # self.performance = randrange(1, 3)
        self.performance = 1

        print("Processor {} performance {}".format(self.no, self.performance))
        self.taskQueue.clear()

    def __str__(self):
        return 'Очередь-{0}|{1}|{2}|Выполняется-{3}'.format(len(self.taskQueue), 'Отправляет' if self.isSending else 'Не отправляет', 'Готов к ВВ' if self.hasPacketToSend else 'Не готов к ВВ', self.currentTask)

    # переместить задачу на процессор
    def execute(self, task):
        self.currentTask = task
        self.procActive = True
        self.taskEndTime = tick + task.size * int(self.performance)

    # на каждом такте процессор что-то делает (или простаивает)
    def handle(self):
        # print(self.no)
        global procEnded, dataOnBus
        if self.over: return

        # if self.isReceiving:
        #     if self.receiveEndTime == tick:
        #         закочнили ждать
                # self.isReceiving = False
                # self.receiveEndTime = 0
            # else:
            #     продолжаем ждать
                # return

        # self.hasMarker = True if (tick+1) % p == no else False

        #if self.currentTask:
        # если какая-то задача была выполнена
        if self.taskEndTime == tick:
            #print('     Задание {0} выполнено'.format(self.currentTask.no))
            for index, j in enumerate(self.currentTask.connections):
                packet = [j, self.currentTask.no, self.currentTask.connectionWeight[index]]
                if self.onProc(j):
                    #print('     Записываем в память')
                    # размещаем данные в буфере
                    self.localMemory.insert(0, packet)
                    self.mail += 1
                else:
                    # или готовим к пересылке
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
                # print('     Пересылка задания {0} закончилась'.format(self.IOC[0][1]))
                self.isSending = False
                # marker.isOccupied = А

                if not self.packetSent:
                    self.IOC.pop(0)
                    self.packetSent = True
                if not self.IOC:
                    self.hasPacketToSend = 0
                    # прекращаем передачу, передаем пакет на шину, удаляем задачу из очереди, освобождаем маркер
                    # print('     Пересылка данных с П-{0}'.format(self.no))
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
                # print('     Начинается пересылка с П-{0} - окончание на {1} такте'.format(self.no, self.sendEndTime))
                self.isSending = True
                marker.isOccupied = True
                if self.sendEndTime == tick + 1:
                    marker.canFree = True
                    dataOnBus = self.IOC.pop(0)
                    self.packetSent = True
                else:
                    self.packetSent = False
                # передача данных
                return
                #print('     П-{0} закончил работу и ушел домой к жене'.format(self.no))
            else:
                # маркера нету, ждем
                return

        #else:
        # если очередь не пуста
        if not self.currentTask:
            if self.taskQueue:
                #костыль
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
        # Добавляем родителей и их состояние (выполнен/не выполнен)
        self.connections = v.u

        # for i in v.u:
        #    self.parents[i] = False
    def __str__(self):
        return '[{0}] Вес - {1}. Родители {2} - {3}'.format(self.no, self.size, self.parentsNo, self.parentsMap)


# Вершина графа
class V:
    # no - номер, wv - вес вершины, u - массив связей, wu - массив весов связей
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
        # print(u)

    def __str__(self):
        return '[{0}] - Вес -{1}. Кластер {2} Родитель для {3} - вес дуг {4}. Статический уровень - {5}'.format(self.no, self.wv, self.isClusterized, self.u, self.wu, self.static_level)


def setC(index, array):
    for i in array:
        i.isClusterized = index


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


class ClusterPool():
    cell = 1
    clusterizedV = set()
    #первая ячейка для некластеризованных верщин
    clusters = [None]

    @classmethod
    def printClusters(self):
        for index, i in enumerate(self.clusters):
            if not index:
                print(' Некластеризованные вершины: ', end='')
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

            cp1 = findCriticalPath()

            if cp1 <= CPcopy:
                # меняем параметр isClusterized  и соединяем петушков

                self.clusters.remove(cluster2)
                CPcopy = findCriticalPath()

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

            newCp = findCriticalPath()
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
            newCp = findCriticalPath()
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
            newCp = findCriticalPath()
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
        '''# сортируем вершины в кластере по убыванию статического уровня
        for index, k in enumerate(self.clusters[v1.isClusterized]):
            k.static_level = successorMaxPath(k) - k.wv
        self.clusters[v1.isClusterized].sort(key=lambda x: -x.static_level)

        # добавляем ребра чтобы была последовательность
        for index, i in enumerate(self.clusters[v1.isClusterized][:-1]):
            tmp2 = self.clusters[v1.isClusterized][index + 1]
            if tmp2.no not in i.u:
                i.u.append(tmp2.no)
                i.wu.append(0)
            if index > 0: tmp2.parent.append(i.no)'''

        CPcopy = findCriticalPath()



class Marker:
    isOccupied = False
    onProc = 0
    canFree = False
    queue = deque()

    @classmethod
    def ask_marker(cls, processor_number):
        cls.queue.append(processor_number)


def buildGraf():
    global matrix
    # ПРОВЕРКИ НА ПРАВИЛЬНОСТЬ ФОРМАТА МАТРИЦЫ
    '''if matrix[0].__len__() != len(vertexWeight) or matrix.__len__() != matrix[0].__len__():
        raise ValueError

    for i in range(N):
        # Получаем массив связей
        u = [j for j in range(matrix[i].__len__()) if matrix[i][j] > 0]
        # Получаем веса дуг
        wu = list(filter(lambda x: x > 0, matrix[i]))
        # print(u, wv)
        graf.append(V(i, vertexWeight[i], u, wu))
    # устанавливаем родительские связи
    for i in graf:
        for j in graf:
            if i == j: continue
            if i.no in j.u:
                i.parent.append(j.no)
    # добавляем в первую ячейку массива некластеризованные вершины'''
    # граф 1
    graf.append(V(0, 2, [8], [50]))
    graf.append(V(1, 1, [4], [20]))
    graf.append(V(2, 4, [5, 6], [40, 30]))
    graf.append(V(3, 2, [7], [10]))
    graf.append(V(4, 4, [8, 9], [1, 30]))
    graf.append(V(5, 1, [9, 12], [2, 10]))
    graf.append(V(6, 2, [10], [10]))
    graf.append(V(7, 3, [10], [20]))
    graf.append(V(8, 1, [11], [20]))
    graf.append(V(9, 2, [11], [1]))
    graf.append(V(10, 1, [12], [10]))
    graf.append(V(11, 5, [13], [30]))
    graf.append(V(12, 2, [14], [10]))
    graf.append(V(13, 2, [], []))
    graf.append(V(14, 1, [], []))

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
    ClusterPool.clusters[0] = []
    for i in graf:
        ClusterPool.clusters[0].append(i)


def buildConstructedGraph(g):
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
    ClusterPool.clusters[0] = []
    for i in graf:
        ClusterPool.clusters[0].append(i)


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


def levelDistribution():
    # определяем самый первый уровень
    for index, i in enumerate(graf):
        if not i.parent:
            i.level = 1
            # levels[0].append(graf_copy.pop(index))

    for index, j in enumerate(graf):
        level(graf, j)
        # for i in graf:
        # print(i.no, i.level)


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


'''def criticalPath():
    for i in graf:
        if not i.u:
            i.path = i.wv
    for i in graf:
        successorList = i.u
        for j in successorList:'''


# уровни от 1 - оо
def findCriticalPath():
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



def initialLoading():
    global p
    counter = 0
    # все вершины на отдельные процессоры
    for index1, i in enumerate(reversed(ClusterPool.clusters)):
        if index1 == len(ClusterPool.clusters) - 1:
            #некластеризованные вершины на разные процессорs
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


def optimizeGraf():
    cpool = ClusterPool()
    edges = {}
    # находим все ребра
    for i in graf:
        for index, j in enumerate(i.u):
            if i.wu[index] not in list(edges.keys()):
                edges[i.wu[index]] = []
            # добавляем ребра в словарь вес - from, to
            edges[i.wu[index]].append([i.no, j])
    # print(edges)
    global_use = 1

    while global_use:
        global_use = 0
        #print('                     Новый приход')
        for i in reversed(sorted(edges.keys())):
            if i == 0: continue

            useful = 1
            while useful and edges[i]:
                useful = 0
                for j in edges[i]:
                    _from = j[1]
                    _to = j[0]
                    t1 = CPcopy
                    #print(_to, _from)
                    cpool.clusterize(graf[_to], graf[_from])
                    # удалось не удалось
                    local_use = 1 if t1 - CPcopy > 0 else 0

                    if local_use:
                        edges[i].remove(j)
                        useful +=1
                        global_use +=1
                        #print('Соединили {0} - {1}. Критический путь - {2}'.format(_to, _from, CPcopy))
                    else:
                        pass
                        #print('Не получилось соединить {0} - {1}'.format(_to, _from))
        #print(CPcopy)
        #ClusterPool.printClusters()
        # exe
        #  0, 1, 2, 3  4, 5, 6

def строка_состояния(str):
    s = '{:<4}p'.format(tick)
    for  i in str:
        tmp = ''
        # if i[0]:
        #     tmp += 'M|'
        # else:
        #     tmp += '-|'
        if i[1]:
            tmp += '{:<2}'.format(i[1].no + 1)
        else:
            if i[5] > 0:
                tmp += '{}<-{}'.format(i[5] + 1, i[6])
            elif i[2]:
                tmp += '{}->{}'.format(i[3] + 1, i[4] + 1)
            else:
                tmp += '-'
        tmp1 = ' {:<15}p '.format(tmp)
        s+=tmp1
    print(s)


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


'''matrix = [[0, 2, 0, 0, 0, 0, 0],
          [0, 0, 10, 0, 0, 0, 0],
          [0, 0, 0, 3, 0, 0, 0],
          [0, 0, 0, 0, 2, 0, 0],
          [0, 0, 0, 0, 0, 4, 0],
          [0, 0, 0, 0, 0, 0, 5],
          [0, 0, 0, 0, 0, 0, 0]]'''
#   0   1   2   3   4   5   6   7   8   9   10  11  12  13  14   15
'''matrix  = [[0,  0,  1,  0,  5,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,   0],
           [0,  0,  0,  0,  1,  0,  20,]]
matrix =    [[0,   1000,  5,   0,   0],
             [0,   0,  0, 1000,   0],
             [0,   0,  0,   0, 1000],
             [0,   0,  0,   0,   0],
             [0,   0,  0,   0,   0]]
N = len(matrix)
vertexWeight = [100, 100, 100, 100, 100]'''

marker = Marker()


def perform_simulation(g=None):
    global tick, procEnded, dataOnBus, CPcopy

    if g is None:
        buildGraf()
    else:
        buildConstructedGraph(g)

    #levelDistribution()
    CPcopy = findCriticalPath()
    print(CPcopy)
    # print(successorMaxPath(graf[0]))
    criticalPath = findCriticalPath()
    # print(criticalPath)
    # print('max = ', maxLevel)
    condition = True

    graf1 = deepcopy(graf)

    '''for i in ClusterPool.clusters:
       if i: print(i)'''

    #print(findCriticalPath())
    optimizeGraf()

    initialLoading()

    ClusterPool.printClusters()
    procEnded = len(procs)
    слово_состояния = [0 for i in procs]
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
            слово_состояния[index] = [i.no == marker.onProc, i.currentTask, i.isSending,
                                      i.sendingFrom, i.sendingTo, i.waitingFor, i.waitingFrom]
        строка_состояния(слово_состояния)
        table.append([convert_status_word(w) for w in слово_состояния])
        tick += 1
        if tick == 5:
            pass
        if tick == 59:
            # break
            pass

    # for index, row in enumerate(result):
    #     print(index, " ".join(row))

    print(findCriticalPath())

    return {
        "table": table,
        "clusters": ClusterPool.getClusters()
    }


if __name__ == "__main__":
    perform_simulation()